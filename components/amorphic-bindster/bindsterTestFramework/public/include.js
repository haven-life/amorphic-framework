var bindsterTestFrameworkReady = false;
function bindsterTestFrameworkGet (bind, data) {
    if (bindsterTestFrameworkReady)
        document.getElementById('bindsterTestFramework_iframe').contentWindow.controller.getData(bind,data)
};
function bindsterTestFrameworkSet(bind, data) {
    if (bindsterTestFrameworkReady)
        document.getElementById('bindsterTestFramework_iframe').contentWindow.controller.setData(bind,data)
};
function bindsterTestFrameworkEvent(event, data, node){
    if (bindsterTestFrameworkReady)
        document.getElementById('bindsterTestFramework_iframe').contentWindow.controller.event(event,data, node)
};
function bindsterTestFrameworkRoute(route) {
    if (bindsterTestFrameworkReady)
        document.getElementById('bindsterTestFramework_iframe').contentWindow.controller.route(route)
};
function bindsterTestFrameworkRender() {
    if (bindsterTestFrameworkReady)
        document.getElementById('bindsterTestFramework_iframe').contentWindow.controller.render()
};
function bindsterTestFrameworkPreRender()
{
    if (bindsterTestFrameworkReady)
        document.getElementById('bindsterTestFramework_iframe').contentWindow.controller.preRender()
};
function bindsterTestFrameworkIsPlaying()
{
    return bindsterTestFrameworkReady &&
        document.getElementById('bindsterTestFramework_iframe').contentWindow.controller.status == 'playing';
};
document.write(
        '<div id="bindsterTestFramework_big" style="display: none;height: 502px;width: 802px;position: fixed; bottom: 20px; right: 20px;background: white;border: 1px solid #888;border-radius: 2px;z-index: 999999;box-shadow: 12px 12px 60px #777;"  onmouseup="document.getElementById(\'bindsterTestFramework_big\').style.display=\'block\';document.getElementById(\'bindsterTestFramework_small\').style.display=\'none\'">' +

        '<iframe id="bindsterTestFramework_iframe" style="height: 80px;width: 800px;" frameborder="0" scrolling="no" src="/bindsterTestFramework/index.html" ></iframe>' +


        '<div id="bindsterTestFramework_output" style="width: 800px; height: 420px; padding: 10px; overflow: scroll;margin-top: -7px;font-size: 10px"></div>' +

        '</div>' +

        '<div id="bindsterTestFramework_off" style="display: off;height: 16px;width: 16px;position: fixed; bottom: 22px; right: 22px;background: orange;border: 1px solid orange;border-radius: 8px;z-index: 999999;box-shadow: 12px 12px 60px #777" onmouseup="document.getElementById(\'bindsterTestFramework_big\').style.display=\'none\';document.getElementById(\'bindsterTestFramework_on\').style.display=\'block\';document.getElementById(\'bindsterTestFramework_off\').style.display=\'none\'"></div>' +

        '<div id="bindsterTestFramework_on" style="height: 16px;width: 16px;position: fixed; bottom: 22px; right: 22px;background: orange;border: 1px solid orange;border-radius: 8px;z-index: 999999;box-shadow: 12px 12px 60px #777" onmouseup="document.getElementById(\'bindsterTestFramework_big\').style.display=\'block\';document.getElementById(\'bindsterTestFramework_on\').style.display=\'none\';document.getElementById(\'bindsterTestFramework_off\').style.display=\'block\'"></div>'
);

