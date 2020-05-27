"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : new P(function (resolve) { resolve(result.value); }).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __generator = (this && this.__generator) || function (thisArg, body) {
    var _ = { label: 0, sent: function() { if (t[0] & 1) throw t[1]; return t[1]; }, trys: [], ops: [] }, f, y, t, g;
    return g = { next: verb(0), "throw": verb(1), "return": verb(2) }, typeof Symbol === "function" && (g[Symbol.iterator] = function() { return this; }), g;
    function verb(n) { return function (v) { return step([n, v]); }; }
    function step(op) {
        if (f) throw new TypeError("Generator is already executing.");
        while (_) try {
            if (f = 1, y && (t = op[0] & 2 ? y["return"] : op[0] ? y["throw"] || ((t = y["return"]) && t.call(y), 0) : y.next) && !(t = t.call(y, op[1])).done) return t;
            if (y = 0, t) op = [op[0] & 2, t.value];
            switch (op[0]) {
                case 0: case 1: t = op; break;
                case 4: _.label++; return { value: op[1], done: false };
                case 5: _.label++; y = op[1]; op = [0]; continue;
                case 7: op = _.ops.pop(); _.trys.pop(); continue;
                default:
                    if (!(t = _.trys, t = t.length > 0 && t[t.length - 1]) && (op[0] === 6 || op[0] === 2)) { _ = 0; continue; }
                    if (op[0] === 3 && (!t || (op[1] > t[0] && op[1] < t[3]))) { _.label = op[1]; break; }
                    if (op[0] === 6 && _.label < t[1]) { _.label = t[1]; t = op; break; }
                    if (t && _.label < t[2]) { _.label = t[2]; _.ops.push(op); break; }
                    if (t[2]) _.ops.pop();
                    _.trys.pop(); continue;
            }
            op = body.call(thisArg, _);
        } catch (e) { op = [6, e]; y = 0; } finally { f = t = 0; }
        if (op[0] & 5) throw op[1]; return { value: op[0] ? op[1] : void 0, done: true };
    }
};
Object.defineProperty(exports, "__esModule", { value: true });
var chai_1 = require("chai");
exports.ServerObjectTemplate = undefined;
exports.ClientObjectTemplate = undefined;
function resetAppRuleSet(RemoteObjectTemplate, app) {
    RemoteObjectTemplate['toClientRuleSet'] = [app];
    RemoteObjectTemplate['toServerRuleSet'] = [app];
}
/**
 * Bootstrap for Semotus tests. Create a server controller and a client controller
 */
function bootstrap(app) {
    // RemoteObjectTemplate will be used for server template creation
    var RemoteObjectTemplate = require('../../../dist');
    resetAppRuleSet(RemoteObjectTemplate, app);
    RemoteObjectTemplate.role = 'server';
    RemoteObjectTemplate._useGettersSetters = true;
    RemoteObjectTemplate.maxCallTime = 60 * 1000;
    RemoteObjectTemplate.__conflictMode__ = 'soft';
    exports.ClientObjectTemplate = RemoteObjectTemplate._createObject();
    exports.ClientObjectTemplate.role = 'client';
    exports.ClientObjectTemplate._useGettersSetters = false;
    exports.ClientObjectTemplate.__conflictMode__ = 'soft';
    exports.ServerObjectTemplate = RemoteObjectTemplate._createObject();
    exports.ServerObjectTemplate.role = 'server';
    exports.ServerObjectTemplate._useGettersSetters = true;
    exports.ServerObjectTemplate.maxCallTime = 60 * 1000;
    exports.ServerObjectTemplate.__conflictMode__ = 'soft';
    exports.ServerObjectTemplate.memSession = {
        semotus: {}
    };
    exports.ServerObjectTemplate.__dictionary__ = RemoteObjectTemplate.__dictionary__;
    function sendToServer(message) {
        exports.ServerObjectTemplate.processMessage(message);
    }
    function sendToClient(message) {
        exports.ClientObjectTemplate.processMessage(message);
    }
    exports.ClientObjectTemplate.createSession('client', sendToServer);
    exports.ServerObjectTemplate.createSession('server', sendToClient);
    exports.ClientObjectTemplate.enableSendMessage(true, sendToServer);
    exports.ServerObjectTemplate.enableSendMessage(true, sendToClient);
    // Create a client controller template with an objectTemplate that has a session.
    var ClientController = createController(exports.ClientObjectTemplate, {});
    // Create a server controller template with an objectTemplate that has no session since the
    // session will be propagated with sessionize.
    var ServerController = createController(exports.ServerObjectTemplate, exports.ClientObjectTemplate.getClasses());
    chai_1.expect(ClientController == ServerController).to.equal(false);
    ClientController.debug = 'client';
    ServerController.debug = 'server';
    function createController(objectTemplate, toClear) {
        RemoteObjectTemplate.bindDecorators(objectTemplate);
        for (var obj in toClear) {
            delete require['cache'][__dirname + '/' + obj + '.js'];
        }
        return require('./Controller.js').Controller;
    }
    var clientController = new ClientController();
    exports.ClientObjectTemplate.controller = clientController;
    // Create the server controller with the same Id so they can sync up
    var serverController = exports.ServerObjectTemplate._createEmptyObject(ServerController, clientController.__id__);
    sync();
    exports.ServerObjectTemplate.controller = serverController;
    exports.ServerObjectTemplate.__changeTracking__ = true;
    exports.ServerObjectTemplate.reqSession = { loggingID: 'test', semotus: {} };
    exports.ServerObjectTemplate.logLevel = 1;
    exports.ServerObjectTemplate.logger.setLevel('info;activity:dataLogging');
    return { server: serverController, client: clientController };
}
exports.bootstrap = bootstrap;
function sync() {
    exports.ServerObjectTemplate.syncSession(undefined);
}
exports.sync = sync;
function callBootstrap(app, scope, state) {
    return __awaiter(this, void 0, void 0, function () {
        var ret, server, client;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    ret = bootstrap(app);
                    server = ret.server;
                    client = ret.client;
                    return [4 /*yield*/, setup(client, server, scope, state)];
                case 1: return [2 /*return*/, _a.sent()];
            }
        });
    });
}
exports.callBootstrap = callBootstrap;
function setup(client, server, scope, state) {
    return __awaiter(this, void 0, void 0, function () {
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    if (!scope) return [3 /*break*/, 2];
                    return [4 /*yield*/, server.setState('server', scope, state)];
                case 1:
                    _a.sent();
                    _a.label = 2;
                case 2:
                    server.mockServerInit(); // Act as if we're initializing the server here
                    return [2 /*return*/, { client: client, server: server }];
            }
        });
    });
}
exports.setup = setup;
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiYm9vdHN0cmFwLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsiYm9vdHN0cmFwLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiI7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7QUFFQSw2QkFBNEI7QUFRakIsUUFBQSxvQkFBb0IsR0FBRyxTQUFTLENBQUM7QUFDakMsUUFBQSxvQkFBb0IsR0FBRyxTQUFTLENBQUM7QUFFNUMsU0FBUyxlQUFlLENBQUMsb0JBQW9CLEVBQUUsR0FBRztJQUM5QyxvQkFBb0IsQ0FBQyxpQkFBaUIsQ0FBQyxHQUFHLENBQUMsR0FBRyxDQUFDLENBQUM7SUFDaEQsb0JBQW9CLENBQUMsaUJBQWlCLENBQUMsR0FBRyxDQUFDLEdBQUcsQ0FBQyxDQUFDO0FBQ3BELENBQUM7QUFFRDs7R0FFRztBQUNILFNBQWdCLFNBQVMsQ0FBQyxHQUFHO0lBRXpCLGlFQUFpRTtJQUNqRSxJQUFJLG9CQUFvQixHQUFHLE9BQU8sQ0FBQyxlQUFlLENBQUMsQ0FBQztJQUNwRCxlQUFlLENBQUMsb0JBQW9CLEVBQUUsR0FBRyxDQUFDLENBQUM7SUFFM0Msb0JBQW9CLENBQUMsSUFBSSxHQUFHLFFBQVEsQ0FBQztJQUNyQyxvQkFBb0IsQ0FBQyxrQkFBa0IsR0FBRyxJQUFJLENBQUM7SUFDL0Msb0JBQW9CLENBQUMsV0FBVyxHQUFHLEVBQUUsR0FBRyxJQUFJLENBQUM7SUFDN0Msb0JBQW9CLENBQUMsZ0JBQWdCLEdBQUcsTUFBTSxDQUFDO0lBRS9DLDRCQUFvQixHQUFHLG9CQUFvQixDQUFDLGFBQWEsRUFBRSxDQUFDO0lBQzVELDRCQUFvQixDQUFDLElBQUksR0FBRyxRQUFRLENBQUM7SUFDckMsNEJBQW9CLENBQUMsa0JBQWtCLEdBQUcsS0FBSyxDQUFDO0lBQ2hELDRCQUFvQixDQUFDLGdCQUFnQixHQUFHLE1BQU0sQ0FBQztJQUUvQyw0QkFBb0IsR0FBRyxvQkFBb0IsQ0FBQyxhQUFhLEVBQUUsQ0FBQztJQUM1RCw0QkFB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LDRCQUFvQixDQUFDLFdBQVcsQ0FBQyxTQUFTLENBQUMsQ0FBQztBQUNoRCxDQUFDO0FBRkQsb0JBRUM7QUFFRCxTQUFzQixhQUFhLENBQUMsR0FBRyxFQUFFLEtBQU0sRUFBRSxLQUFNOzs7Ozs7b0JBQzdDLEdBQUcsR0FBRyxTQUFTLENBQUMsR0FBRyxDQUFDLENBQUM7b0JBQ3JCLE1BQU0sR0FBRyxHQUFHLENBQUMsTUFBTSxDQUFDO29CQUNwQixNQUFNLEdBQUcsR0FBRyxDQUFDLE1BQU0sQ0FBQztvQkFDbkIscUJBQU0sS0FBSyxDQUFDLE1BQU0sRUFBRSxNQUFNLEVBQUUsS0FBSyxFQUFFLEtBQUssQ0FBQyxFQUFBO3dCQUFoRCxzQkFBTyxTQUF5QyxFQUFDOzs7O0NBQ3BEO0FBTEQsc0NBS0M7QUFFRCxTQUFzQixLQUFLLENBQUMsTUFBTSxFQUFFLE1BQU0sRUFBRSxLQUFNLEVBQUUsS0FBTTs7Ozs7eUJBQ2xELEtBQUssRUFBTCx3QkFBSztvQkFDTCxxQkFBTSxNQUFNLENBQUMsUUFBUSxDQUFDLFFBQVEsRUFBRSxLQUFLLEVBQUUsS0FBSyxDQUFDLEVBQUE7O29CQUE3QyxTQUE2QyxDQUFDOzs7b0JBRWxELE1BQU0sQ0FBQyxjQUFjLEVBQUUsQ0FBQyxDQUFDLCtDQUErQztvQkFDeEUsc0JBQU8sRUFBQyxNQUFNLFFBQUEsRUFBRSxNQUFNLFFBQUEsRUFBQyxFQUFDOzs7O0NBQzNCO0FBTkQsc0JBTUMiLCJzb3VyY2VzQ29udGVudCI6WyJkZWNsYXJlIGZ1bmN0aW9uIHJlcXVpcmUobmFtZTogc3RyaW5nKTtcblxuaW1wb3J0IHtleHBlY3R9IGZyb20gJ2NoYWknO1xuXG5leHBvcnQgdHlwZSByZXRWYWwgPVxuICAgIHtcbiAgICAgICAgY2xpZW50OiBhbnk7XG4gICAgICAgIHNlcnZlcjogYW55O1xuICAgIH1cblxuZXhwb3J0IGxldCBTZXJ2ZXJPYmplY3RUZW1wbGF0ZSA9IHVuZGVmaW5lZDtcbmV4cG9ydCBsZXQgQ2xpZW50T2JqZWN0VGVtcGxhdGUgPSB1bmRlZmluZWQ7XG5cbmZ1bmN0aW9uIHJlc2V0QXBwUnVsZVNldChSZW1vdGVPYmplY3RUZW1wbGF0ZSwgYXBwKSB7XG4gICAgUmVtb3RlT2JqZWN0VGVtcGxhdGVbJ3RvQ2xpZW50UnVsZVNldCddID0gW2FwcF07XG4gICAgUmVtb3RlT2JqZWN0VGVtcGxhdGVbJ3RvU2VydmVyUnVsZVNldCddID0gW2FwcF07XG59XG5cbi8qKlxuICogQm9vdHN0cmFwIGZvciBTZW1vdHVzIHRlc3RzLiBDcmVhdGUgYSBzZXJ2ZXIgY29udHJvbGxlciBhbmQgYSBjbGllbnQgY29udHJvbGxlclxuICovXG5leHBvcnQgZnVuY3Rpb24gYm9vdHN0cmFwKGFwcCk6IHJldFZhbCB7XG5cbiAgICAvLyBSZW1vdGVPYmplY3RUZW1wbGF0ZSB3aWxsIGJlIHVzZWQgZm9yIHNlcnZlciB0ZW1wbGF0ZSBjcmVhdGlvblxuICAgIHZhciBSZW1vdGVPYmplY3RUZW1wbGF0ZSA9IHJlcXVpcmUoJy4uLy4uLy4uL2Rpc3QnKTtcbiAgICByZXNldEFwcFJ1bGVTZXQoUmVtb3RlT2JqZWN0VGVtcGxhdGUsIGFwcCk7XG5cbiAgICBSZW1vdGVPYmplY3RUZW1wbGF0ZS5yb2xlID0gJ3NlcnZlcic7XG4gICAgUmVtb3RlT2JqZWN0VGVtcGxhdGUuX3VzZUdldHRlcnNTZXR0ZXJzID0gdHJ1ZTtcbiAgICBSZW1vdGVPYmplY3RUZW1wbGF0ZS5tYXhDYWxsVGltZSA9IDYwICogMTAwMDtcbiAgICBSZW1vdGVPYmplY3RUZW1wbGF0ZS5fX2NvbmZsaWN0TW9kZV9fID0gJ3NvZnQnO1xuXG4gICAgQ2xpZW50T2JqZWN0VGVtcGxhdGUgPSBSZW1vdGVPYmplY3RUZW1wbGF0ZS5fY3JlYXRlT2JqZWN0KCk7XG4gICAgQ2xpZW50T2JqZWN0VGVtcGxhdGUucm9sZSA9ICdjbGllbnQnO1xuICAgIENsaWVudE9iamVjdFRlbXBsYXRlLl91c2VHZXR0ZXJzU2V0dGVycyA9IGZhbHNlO1xuICAgIENsaWVudE9iamVjdFRlbXBsYXRlLl9fY29uZmxpY3RNb2RlX18gPSAnc29mdCc7XG5cbiAgICBTZXJ2ZXJPYmplY3RUZW1wbGF0ZSA9IFJlbW90ZU9iamVjdFRlbXBsYXRlLl9jcmVhdGVPYmplY3QoKTtcbiAgICBTZXJ2ZXJPYmplY3RUZW1wbGF0ZS5yb2xlID0gJ3NlcnZlcic7XG4gICAgU2VydmVyT2JqZWN0VGVtcGxhdGUuX3VzZUdldHRlcnNTZXR0ZXJzID0gdHJ1ZTtcbiAgICBTZXJ2ZXJPYmplY3RUZW1wbGF0ZS5tYXhDYWxsVGltZSA9IDYwICogMTAwMDtcbiAgICBTZXJ2ZXJPYmplY3RUZW1wbGF0ZS5fX2NvbmZsaWN0TW9kZV9fID0gJ3NvZnQnO1xuICAgIFNlcnZlck9iamVjdFRlbXBsYXRlLm1lbVNlc3Npb24gPSB7XG4gICAgICAgIHNlbW90dXM6IHt9XG4gICAgfTtcblxuICAgIFNlcnZlck9iamVjdFRlbXBsYXRlLl9fZGljdGlvbmFyeV9fID0gUmVtb3RlT2JqZWN0VGVtcGxhdGUuX19kaWN0aW9uYXJ5X187XG5cblxuICAgIGZ1bmN0aW9uIHNlbmRUb1NlcnZlcihtZXNzYWdlKSB7XG4gICAgICAgIFNlcnZlck9iamVjdFRlbXBsYXRlLnByb2Nlc3NNZXNzYWdlKG1lc3NhZ2UpO1xuICAgIH1cblxuICAgIGZ1bmN0aW9uIHNlbmRUb0NsaWVudChtZXNzYWdlKSB7XG4gICAgICAgIENsaWVudE9iamVjdFRlbXBsYXRlLnByb2Nlc3NNZXNzYWdlKG1lc3NhZ2UpO1xuICAgIH1cblxuICAgIENsaWVudE9iamVjdFRlbXBsYXRlLmNyZWF0ZVNlc3Npb24oJ2NsaWVudCcsIHNlbmRUb1NlcnZlcik7XG4gICAgU2VydmVyT2JqZWN0VGVtcGxhdGUuY3JlYXRlU2Vzc2lvbignc2VydmVyJywgc2VuZFRvQ2xpZW50KTtcblxuICAgIENsaWVudE9iamVjdFRlbXBsYXRlLmVuYWJsZVNlbmRNZXNzYWdlKHRydWUsIHNlbmRUb1NlcnZlcik7XG4gICAgU2VydmVyT2JqZWN0VGVtcGxhdGUuZW5hYmxlU2VuZE1lc3NhZ2UodHJ1ZSwgc2VuZFRvQ2xpZW50KTtcblxuXG4gICAgLy8gQ3JlYXRlIGEgY2xpZW50IGNvbnRyb2xsZXIgdGVtcGxhdGUgd2l0aCBhbiBvYmplY3RUZW1wbGF0ZSB0aGF0IGhhcyBhIHNlc3Npb24uXG4gICAgdmFyIENsaWVudENvbnRyb2xsZXIgPSBjcmVhdGVDb250cm9sbGVyKENsaWVudE9iamVjdFRlbXBsYXRlLCB7fSk7XG5cbiAgICAvLyBDcmVhdGUgYSBzZXJ2ZXIgY29udHJvbGxlciB0ZW1wbGF0ZSB3aXRoIGFuIG9iamVjdFRlbXBsYXRlIHRoYXQgaGFzIG5vIHNlc3Npb24gc2luY2UgdGhlXG4gICAgLy8gc2Vzc2lvbiB3aWxsIGJlIHByb3BhZ2F0ZWQgd2l0aCBzZXNzaW9uaXplLlxuICAgIHZhciBTZXJ2ZXJDb250cm9sbGVyID0gY3JlYXRlQ29udHJvbGxlcihTZXJ2ZXJPYmplY3RUZW1wbGF0ZSwgQ2xpZW50T2JqZWN0VGVtcGxhdGUuZ2V0Q2xhc3NlcygpKTtcblxuICAgIGV4cGVjdChDbGllbnRDb250cm9sbGVyID09IFNlcnZlckNvbnRyb2xsZXIpLnRvLmVxdWFsKGZhbHNlKTtcblxuICAgIENsaWVudENvbnRyb2xsZXIuZGVidWcgPSAnY2xpZW50JztcbiAgICBTZXJ2ZXJDb250cm9sbGVyLmRlYnVnID0gJ3NlcnZlcic7XG5cbiAgICBmdW5jdGlvbiBjcmVhdGVDb250cm9sbGVyKG9iamVjdFRlbXBsYXRlLCB0b0NsZWFyKSB7XG4gICAgICAgIFJlbW90ZU9iamVjdFRlbXBsYXRlLmJpbmREZWNvcmF0b3JzKG9iamVjdFRlbXBsYXRlKTtcblxuICAgICAgICBmb3IgKHZhciBvYmogaW4gdG9DbGVhcikge1xuICAgICAgICAgICAgZGVsZXRlIHJlcXVpcmVbJ2NhY2hlJ11bX19kaXJuYW1lICsgJy8nICsgb2JqICsgJy5qcyddO1xuICAgICAgICB9XG4gICAgICAgIHJldHVybiByZXF1aXJlKCcuL0NvbnRyb2xsZXIuanMnKS5Db250cm9sbGVyO1xuICAgIH1cblxuICAgIHZhciBjbGllbnRDb250cm9sbGVyID0gbmV3IENsaWVudENvbnRyb2xsZXIoKTtcbiAgICBDbGllbnRPYmplY3RUZW1wbGF0ZS5jb250cm9sbGVyID0gY2xpZW50Q29udHJvbGxlcjtcblxuICAgIC8vIENyZWF0ZSB0aGUgc2VydmVyIGNvbnRyb2xsZXIgd2l0aCB0aGUgc2FtZSBJZCBzbyB0aGV5IGNhbiBzeW5jIHVwXG4gICAgdmFyIHNlcnZlckNvbnRyb2xsZXIgPSBTZXJ2ZXJPYmplY3RUZW1wbGF0ZS5fY3JlYXRlRW1wdHlPYmplY3QoU2VydmVyQ29udHJvbGxlciwgY2xpZW50Q29udHJvbGxlci5fX2lkX18pO1xuXG4gICAgc3luYygpO1xuICAgIFNlcnZlck9iamVjdFRlbXBsYXRlLmNvbnRyb2xsZXIgPSBzZXJ2ZXJDb250cm9sbGVyO1xuICAgIFNlcnZlck9iamVjdFRlbXBsYXRlLl9fY2hhbmdlVHJhY2tpbmdfXyA9IHRydWU7XG4gICAgU2VydmVyT2JqZWN0VGVtcGxhdGUucmVxU2Vzc2lvbiA9IHtsb2dnaW5nSUQ6ICd0ZXN0Jywgc2Vtb3R1czoge319O1xuICAgIFNlcnZlck9iamVjdFRlbXBsYXRlLmxvZ0xldmVsID0gMTtcbiAgICBTZXJ2ZXJPYmplY3RUZW1wbGF0ZS5sb2dnZXIuc2V0TGV2ZWwoJ2luZm87YWN0aXZpdHk6ZGF0YUxvZ2dpbmcnKTtcblxuICAgIHJldHVybiB7c2VydmVyOiBzZXJ2ZXJDb250cm9sbGVyLCBjbGllbnQ6IGNsaWVudENvbnRyb2xsZXJ9O1xufVxuXG5leHBvcnQgZnVuY3Rpb24gc3luYygpIHtcbiAgICBTZXJ2ZXJPYmplY3RUZW1wbGF0ZS5zeW5jU2Vzc2lvbih1bmRlZmluZWQpO1xufVxuXG5leHBvcnQgYXN5bmMgZnVuY3Rpb24gY2FsbEJvb3RzdHJhcChhcHAsIHNjb3BlPywgc3RhdGU/KSB7XG4gICAgY29uc3QgcmV0ID0gYm9vdHN0cmFwKGFwcCk7XG4gICAgY29uc3Qgc2VydmVyID0gcmV0LnNlcnZlcjtcbiAgICBjb25zdCBjbGllbnQgPSByZXQuY2xpZW50O1xuICAgIHJldHVybiBhd2FpdCBzZXR1cChjbGllbnQsIHNlcnZlciwgc2NvcGUsIHN0YXRlKTtcbn1cblxuZXhwb3J0IGFzeW5jIGZ1bmN0aW9uIHNldHVwKGNsaWVudCwgc2VydmVyLCBzY29wZT8sIHN0YXRlPykge1xuICAgIGlmIChzY29wZSkge1xuICAgICAgICBhd2FpdCBzZXJ2ZXIuc2V0U3RhdGUoJ3NlcnZlcicsIHNjb3BlLCBzdGF0ZSk7XG4gICAgfVxuICAgIHNlcnZlci5tb2NrU2VydmVySW5pdCgpOyAvLyBBY3QgYXMgaWYgd2UncmUgaW5pdGlhbGl6aW5nIHRoZSBzZXJ2ZXIgaGVyZVxuICAgIHJldHVybiB7Y2xpZW50LCBzZXJ2ZXJ9O1xufSJdfQ==