export class AmorphicUtils {

    static toBool(value, defaultValue: boolean = false): boolean {
        switch (typeof value) {
          case 'undefined':
            return defaultValue;
          case 'boolean':
            return value;
          case 'string':
            return value.toLowerCase() !== 'false';
        }
        return Boolean(value);
    }
}