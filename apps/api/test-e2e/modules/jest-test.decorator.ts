interface ConstructorType {
  new (): void;
}

interface FunctionType {
  (): void;
}

export declare const DecoratedSuites: {
  [suiteName: string]: {
    title?: string;
    target?: ConstructorType;
    parallel: boolean;
    tests: Array<{
      method: FunctionType;
      description: string;
    }>;
  };
};

export const TestSuite =
  (title: string, parallel = false) =>
  (target: ConstructorType): void => {
    target.prototype.title = title;
    if (!DecoratedSuites.hasOwnProperty(target.name)) {
      DecoratedSuites[target.name] = { tests: [], title, parallel, target };
    }
    DecoratedSuites[target.name].title = title;
    DecoratedSuites[target.name].parallel = parallel;
    DecoratedSuites[target.name].target = target;
  };

/* eslint-disable  @typescript-eslint/ban-types */
export function Test(description: string): MethodDecorator {
  return (
    target: object,
    _propertyKey: string | symbol,
    descriptor: PropertyDescriptor,
  ): void => {
    const className = target.constructor.name;
    if (!DecoratedSuites.hasOwnProperty(className)) {
      DecoratedSuites[className] = {
        tests: [],
        parallel: false,
      };
    }
    DecoratedSuites[className].tests.push({
      description,
      method: descriptor.value,
    });
  };
}
