// jest.d.ts
import 'jest';

declare global {
    namespace jest {
        // eslint-disable-next-line @typescript-eslint/naming-convention
        interface Matchers<R> {
            toContainObject(argument: object): R;

            toBeArrayEqual(expected: unknown[]): R;

            toBeDateEqualWithoutMilliseconds(expected): R;
        }
    }
}

export {};
