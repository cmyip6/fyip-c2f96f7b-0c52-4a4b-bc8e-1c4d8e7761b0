export type Constructor<T = any> = new (...args: any[]) => T;

export interface TestMethodMetadata {
  description: string;
  propertyKey: string | symbol;
}

export interface TestSuiteMetadata {
  title: string;
  target: Constructor;
  parallel: boolean;
  tests: TestMethodMetadata[];
}
export interface StandardDecoratorContext {
  name: string | symbol;
}

export const TestSuitesStorage = new Map<string, TestSuiteMetadata>();

export const TestSuite = (title: string, parallel = false): ClassDecorator => {
  return (target: Function) => {
    const className = target.name;

    if (!TestSuitesStorage.has(className)) {
      TestSuitesStorage.set(className, {
        title,
        target: target as Constructor,
        parallel,
        tests: [],
      });
    } else {
      const existing = TestSuitesStorage.get(className)!;
      existing.title = title;
      existing.target = target as Constructor;
      existing.parallel = parallel;
    }
  };
};

export function Test(description: string) {
  return (
    target: object,
    propertyKey: string | symbol | StandardDecoratorContext,
    _descriptor?: PropertyDescriptor | unknown,
  ): void => {
    const className = (target as { constructor: { name: string } }).constructor
      .name;

    if (!TestSuitesStorage.has(className)) {
      TestSuitesStorage.set(className, {
        title: className,
        target: (target as { constructor: Constructor }).constructor,
        parallel: false,
        tests: [],
      });
    }

    const suite = TestSuitesStorage.get(className)!;

    const key =
      typeof propertyKey === 'object' &&
      propertyKey !== null &&
      'name' in propertyKey
        ? (propertyKey as StandardDecoratorContext).name
        : (propertyKey as string | symbol);

    suite.tests.push({ description, propertyKey: key });
  };
}
