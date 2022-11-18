export class AmorphicUtils {

    static toBool(value, defaultValue: boolean = false): boolean {
        switch (typeof value) {
          case 'undefined':
            return defaultValue;
          case 'boolean':
            return value;
          case 'string':
            if (value.toLowerCase() === 'true') {
                return true;
            }
        }
        return false;
    }

    static setLogMetadataAttributes(req: any, res: any, next: any) {
        const rawData = req && req.body;
        if (rawData) {
            const clientIpAddress = AmorphicUtils.getIpAddressFromRequest(req);
            rawData.request ? rawData.request.clientIpAddress = clientIpAddress : 
                rawData.request = { clientIpAddress };
        }
        next();
    }

    static getIpAddressFromRequest(req: any) {
        const unknown = 'unknown';
        if (!req || !req.headers || !req.connection) {
            return unknown;
        }
        const ip = req.headers['x-forwarded-for'] || req.connection.remoteAddress;
        if (!ip) {
            return unknown;
        }

        return (String(ip)).split(',')[0].replace(/(.*)[:](.*)/, '$2') || unknown;
    }
}