import { expect } from 'chai';
import mockfs from 'mock-fs'
import { BuildSupertypeConfig, SupertypeConfig } from '../../src/index';

describe('SupertypeConfig', function() {

    describe('validation', function() {
        it('should throw if null or "" path is used as root', function() {
            expect(BuildSupertypeConfig.bind(BuildSupertypeConfig,undefined)).to.throw('Valid root path expected. rootDir[undefined]');
            expect(BuildSupertypeConfig.bind(BuildSupertypeConfig,null)).to.throw('Valid root path expected. rootDir[null]');
            expect(BuildSupertypeConfig.bind(BuildSupertypeConfig,'')).to.throw('Valid root path expected. rootDir[]');
        });
    });

    describe('empty application list', function() {

        let myCfg;
        beforeEach(function() {
            myCfg = new SupertypeConfig();
            myCfg.loadFile('foo', 'bar.json');
        });

        it('should return the global "root" config and all available configs', function() {
            mockfs({
                '/my/root': {
                    'config.json': JSON.stringify({
                        'applications': {
                            'customer': 'apps/customer'
                        },
                        'application': ''
                    })
                }
            });
            const configStore = BuildSupertypeConfig('/my/root');

            const props = Object.getOwnPropertyNames(configStore);
            expect(props.length).to.equal(2);
            expect(props[0]).to.equal('root');
            expect(props[1]).to.equal('customer');

            expect(configStore['root']).to.not.be.null;
        });

        afterEach(function() {
            mockfs.restore();
        });
    });

    describe('single application not in the list', function() {
        let myCfg, builder;
        beforeEach(function() {
            myCfg = new SupertypeConfig();
            myCfg.loadFile('foo', 'bar.json');
        });

        it('should return the "root" config and all available configs', function() {

            mockfs({
                '/my/root': {
                    'config.json': JSON.stringify({
                        'applications': {
                            'app1': 'dir/app1'
                        },
                        'application': 'app2'
                    })
                }
            });
            var configStore = BuildSupertypeConfig('/my/root');

            var props = Object.getOwnPropertyNames(configStore);
            expect(props.length).to.equal(2);
            expect(props[0]).to.equal('root');
            expect(props[1]).to.equal('app1');

            expect(configStore['root']).to.not.be.null;

            expect(configStore['app1']).to.not.be.null;

        });

        afterEach(function() {
            mockfs.restore();
        });

    });

    describe('single application in the list', function() {

        let myCfg;

        it('should return "root" and all available configs including startup app', function() {
            mockfs({
                '/my/root': {
                    'config.json': JSON.stringify({
                        'applications': {
                            'app1': 'dir/app1',
                            'app2': 'dir/app2',
                            'app3': 'dir/app3'
                        },
                        'application': 'app2',
                        'testkey': 'rootvalue'
                    })
                }
            });
            var configStore = BuildSupertypeConfig('/my/root');

            var props = Object.getOwnPropertyNames(configStore);
            expect(props.length).to.equal(4);
            expect(props[0]).to.equal('root');
            expect(props[1]).to.equal('app1');
            expect(props[2]).to.equal('app2');
            expect(props[3]).to.equal('app3');

            expect(configStore['root']).to.not.be.null;

            expect(configStore['app1']).to.not.be.null;
            //without overrides it will be same as root config
            expect(configStore['app2']).to.not.be.null;
            expect(configStore['app2'].get('testkey')).to.equal('rootvalue');

            expect(configStore['app3']).to.not.be.null;

        });

        it('should return the app config with the app level override, including all available', function() {
            mockfs({
                '/my/root': {
                    'config.json': JSON.stringify({
                        'applications': {
                            'app1': 'dir/app1',
                            'app2': 'dir/app2',
                            'app3': 'dir/app3'
                        },
                        'application': 'app2',
                        'testkey': 'rootvalue'
                    })
                },
                '/my/root/dir/app2': {
                    'config.json': JSON.stringify({
                        'testkey': 'dir_app2_value'
                    })
                }
            });
            var configStore = BuildSupertypeConfig('/my/root');

            var props = Object.getOwnPropertyNames(configStore);
            expect(props.length).to.equal(4);
            expect(props[0]).to.equal('root');
            expect(props[1]).to.equal('app1');
            expect(props[2]).to.equal('app2');
            expect(props[3]).to.equal('app3');

            expect(configStore['root']).to.not.be.null;
            expect(configStore['app1']).to.not.be.null;

            //without overrides it will be same as root config
            expect(configStore['app2']).to.not.be.null;
            expect(configStore['app2'].get('testkey')).to.equal('dir_app2_value');

            expect(configStore['app3']).to.not.be.null;
        });

        it('should return the app config with the common level override', function() {
            mockfs({
                '/my/root': {
                    'config.json': JSON.stringify({
                        'applications': {
                            'app1': 'dir/app1',
                            'app2': 'dir/app2',
                            'app3': 'dir/app3'
                        },
                        'application': 'app2',
                        'testkey': 'rootvalue'
                    })
                },
                '/my/root/apps/common': {
                    'config.json': JSON.stringify({
                        'testkey': 'dir_common_value'
                    })
                }
            });
            var configStore = BuildSupertypeConfig('/my/root');

            var props = Object.getOwnPropertyNames(configStore);
            expect(props.length).to.equal(4);
            expect(props[0]).to.equal('root');
            expect(props[1]).to.equal('app1');
            expect(props[2]).to.equal('app2');
            expect(props[3]).to.equal('app3');

            expect(configStore['app2']).to.not.be.null;
            expect(configStore['app2'].get('testkey')).to.equal('dir_common_value');

        });

        afterEach(function() {
            mockfs.restore();
        });
    });



    describe('multiple applications in the list', function() {
        it('should return "root" and all of avaible configured apps, not just what is starting up', function() {
            mockfs({
                '/my/root': {
                    'config.json': JSON.stringify({
                        'applications': {
                            'app1': 'dir/app1',
                            'app2': 'dir/app2',
                            'app3': 'dir/app3',
                            'app4': 'dir/app4',
                            'app5': 'dir/app5'
                        },
                        'application': 'app2;app3;app4',
                        'testkey': 'rootvalue',
                        'testObj': {
                            'testObjkey2' : 'value_root_2'
                        }
                    })
                },
                '/my/root/apps/common': {
                    'config.json': JSON.stringify({
                        'testkey': 'dir_common_value',
                        'testObj': {
                            'testObjkey1' : 'value_common_1'
                        }
                    })
                },
                '/my/root/dir/app3': {
                    'config.json': JSON.stringify({
                        'testkey': 'dir_app3_value'
                    })
                },
                '/my/root/dir/app4': {
                    'config.json': JSON.stringify({
                        'testObj': {
                            'testObjkey1' : 'value_app_4_1'
                        }
                    })
                }
            });
            var configStore = BuildSupertypeConfig('/my/root');

            var props = Object.getOwnPropertyNames(configStore);
            expect(props.length).to.equal(6);
            expect(props[0]).to.equal('root');
            expect(props[1]).to.equal('app1');
            expect(props[2]).to.equal('app2');
            expect(props[3]).to.equal('app3');
            expect(props[4]).to.equal('app4');
            expect(props[5]).to.equal('app5');

            expect(configStore['root']).to.not.be.null;
            expect(configStore['app1']).to.not.be.null;

            expect(configStore['app2']).to.not.be.null;
            expect(configStore['app2'].get('testkey')).to.equal('dir_common_value');
            expect(configStore['app2'].get('testObj:testObjkey1')).to.equal('value_common_1');
            expect(configStore['app2'].get('testObj:testObjkey2')).to.equal('value_root_2');


            expect(configStore['app3']).to.not.be.null;
            expect(configStore['app3'].get('testkey')).to.equal('dir_app3_value');
            expect(configStore['app3'].get('testObj:testObjkey1')).to.equal('value_common_1');
            expect(configStore['app3'].get('testObj:testObjkey2')).to.equal('value_root_2');


            expect(configStore['app4']).to.not.be.null;
            expect(configStore['app4'].get('testkey')).to.equal('dir_common_value');
            expect(configStore['app4'].get('testObj:testObjkey1')).to.equal('value_app_4_1');
            expect(configStore['app4'].get('testObj:testObjkey2')).to.equal('value_root_2');

            expect(configStore['app5']).to.not.be.null;

        });


        afterEach(function() {
            mockfs.restore();
        });
    });

});
