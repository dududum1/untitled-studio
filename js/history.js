/**
 * UNTITLED STUDIO - HISTORY MANAGER
 * Undo/redo with state snapshots
 * 
 * MEMORY OPTIMIZATION:
 * - Stores only JSON AdjustmentState (no bitmaps)
 * - Efficient deep clone via JSON serialization
 * 
 * TV GIRL POLISH:
 * - Haptic feedback (5ms vibration) on undo/redo
 */

class HistoryManager {
    constructor(maxStates = 50) {
        this.maxStates = maxStates;
        this.states = [];
        this.snapshots = []; // Verified States
        this.currentIndex = -1;
        this.isRecording = true;

        // Debounce for rapid changes
        this.debounceTimer = null;
        this.debounceDelay = 300;

        // Callbacks
        this.onStateChange = null;

        // Haptic feedback enabled
        this.hapticsEnabled = typeof navigator.vibrate === 'function';
    }

    /**
     * Trigger haptic feedback for tactile response
     */
    _hapticPulse() {
        if (this.hapticsEnabled) {
            try {
                navigator.vibrate(5);
            } catch (e) {
                // Silently fail if vibration not permitted
            }
        }
    }

    /**
     * Push a new state to history
     * NOTE: Only stores JSON-serializable data (no bitmaps!)
     */
    push(state, label = 'Adjustment') {
        if (!this.isRecording) return;

        // Clear debounce timer
        if (this.debounceTimer) {
            clearTimeout(this.debounceTimer);
        }

        // Debounce rapid changes
        this.debounceTimer = setTimeout(() => {
            this._pushState(state, label);
        }, this.debounceDelay);
    }

    /**
     * Push state immediately (no debounce)
     */
    pushImmediate(state, label = 'Adjustment') {
        if (!this.isRecording) return;

        if (this.debounceTimer) {
            clearTimeout(this.debounceTimer);
            this.debounceTimer = null;
        }

        this._pushState(state, label);
    }

    /**
     * Internal push implementation
     * State must be JSON-serializable (no Bitmaps, Blobs, etc.)
     */
    _pushState(state, label) {
        // Remove any states after current index (redo history)
        if (this.currentIndex < this.states.length - 1) {
            this.states = this.states.slice(0, this.currentIndex + 1);
        }

        // Deep clone via JSON (ensures no references, validates serializable)
        // This is the key memory optimization - we only store adjustment values
        const snapshot = {
            data: JSON.parse(JSON.stringify(state)),
            label,
            timestamp: Date.now()
        };

        // Add new state
        this.states.push(snapshot);
        this.currentIndex = this.states.length - 1;

        // Limit history size (oldest states are dropped)
        if (this.states.length > this.maxStates) {
            this.states.shift();
            this.currentIndex--;
        }

        this._notifyChange();
    }

    /**
     * Undo - go back one state
     * Includes haptic feedback for TV Girl feel
     */
    undo() {
        if (!this.canUndo()) return null;

        this._hapticPulse(); // Tactile feedback

        this.currentIndex--;
        this._notifyChange();

        return this.getCurrentState();
    }

    /**
     * Redo - go forward one state
     * Includes haptic feedback for TV Girl feel
     */
    redo() {
        if (!this.canRedo()) return null;

        this._hapticPulse(); // Tactile feedback

        this.currentIndex++;
        this._notifyChange();

        return this.getCurrentState();
    }

    /**
     * Check if undo is available
     */
    canUndo() {
        return this.currentIndex > 0;
    }

    /**
     * Check if redo is available
     */
    canRedo() {
        return this.currentIndex < this.states.length - 1;
    }

    /**
     * Get current state
     */
    getCurrentState() {
        if (this.currentIndex < 0 || this.currentIndex >= this.states.length) {
            return null;
        }
        return this.states[this.currentIndex].data;
    }

    /**
     * Get state at specific index
     */
    getState(index) {
        if (index < 0 || index >= this.states.length) {
            return null;
        }
        return this.states[index].data;
    }

    /**
     * Jump to a specific state index
     * Includes haptic feedback
     */
    jumpTo(index) {
        if (index < 0 || index >= this.states.length) return null;

        this._hapticPulse();

        this.currentIndex = index;
        this._notifyChange();

        return this.getCurrentState();
    }

    /**
     * Get all states for display (lightweight metadata only)
     */
    getStates() {
        return this.states.map((state, index) => ({
            index,
            label: state.label,
            timestamp: state.timestamp,
            isCurrent: index === this.currentIndex
        }));
    }

    /**
     * Get approximate memory usage in bytes
     */
    getMemoryUsage() {
        let totalSize = 0;
        for (const state of this.states) {
            totalSize += JSON.stringify(state.data).length * 2; // ~2 bytes per char
        }
        return totalSize;
    }

    /**
     * Create a named snapshot
     */
    createSnapshot(name) {
        const state = this.getCurrentState();
        if (!state) return;

        this.snapshots.push({
            id: Date.now() + '_' + Math.random().toString(36).substr(2, 9),
            name: name || `Version ${this.snapshots.length + 1}`,
            timestamp: Date.now(),
            data: JSON.parse(JSON.stringify(state))
        });

        this._hapticPulse();
        this._notifyChange();
    }

    /**
     * Restore a snapshot (pushes as new state)
     */
    restoreSnapshot(id) {
        const snap = this.snapshots.find(s => s.id === id);
        if (!snap) return;

        this.push(snap.data, `Restored: ${snap.name}`);
    }

    /**
     * Delete a snapshot
     */
    deleteSnapshot(id) {
        this.snapshots = this.snapshots.filter(s => s.id !== id);
        this._notifyChange();
    }

    getSnapshots() {
        return this.snapshots;
    }

    /**
     * Get history length
     */
    get length() {
        return this.states.length;
    }

    /**
     * Clear all history
     */
    clear() {
        this.states = [];
        this.currentIndex = -1;
        this._notifyChange();
    }

    /**
     * Pause recording
     */
    pause() {
        this.isRecording = false;
    }

    /**
     * Resume recording
     */
    resume() {
        this.isRecording = true;
    }

    /**
     * Notify state change
     */
    _notifyChange() {
        if (this.onStateChange) {
            this.onStateChange({
                canUndo: this.canUndo(),
                canRedo: this.canRedo(),
                currentIndex: this.currentIndex,
                totalStates: this.states.length,
                states: this.getStates(),
                snapshots: this.snapshots
            });
        }
    }

    /**
     * Format timestamp for display
     */
    static formatTime(timestamp) {
        const date = new Date(timestamp);
        return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
    }

    /**
     * Cleanup
     */
    destroy() {
        if (this.debounceTimer) {
            clearTimeout(this.debounceTimer);
        }
        this.states = [];
        this.onStateChange = null;
    }
}

// Export
if (typeof module !== 'undefined' && module.exports) {
    module.exports = HistoryManager;
}
