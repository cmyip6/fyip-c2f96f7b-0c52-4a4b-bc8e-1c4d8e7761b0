// jest.d.ts
import 'jest';

declare global {
    namespace jest {
         
        interface Matchers<R> {
            toContainObject(argument: object): R;

            toBeArrayEqual(expected: unknown[]): R;

            toBeDateEqualWithoutMilliseconds(expected): R;
        }
    }
}

export {};
