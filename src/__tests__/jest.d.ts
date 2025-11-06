/// <reference types="jest" />

// Ensure Jest globals are available in test files
declare global {
    namespace jest {
        interface Matchers<R> {
            toHaveLength(length: number): R;
            toContain(item: any): R;
            toBeDefined(): R;
            toBeUndefined(): R;
            toBeNull(): R;
            toBeTruthy(): R;
            toBeFalsy(): R;
        }
    }
}

export { };