BigBlueButton_tab = function(parent, appCtxt) {
    ZaTabView.call(this, parent,"BigBlueButton_tab");
    ZaTabView.call(this, {
        parent:parent,
        iKeyName:"BigBlueButton_tab",
        contextId:"BigBlueButton"
    });
    this._appCtxt = appCtxt;
    this.setScrollStyle(Dwt.SCROLL);
    document.getElementById('ztab__BigBlueButton').innerHTML = "<div style='padding-left:10px'><h1>BigBlueButton test</h1>" +
        "Credentials for BigBlueButton server.<br><br><table><tr><td>Server URL:</td><td><input type='text' id='BigBlueButton_serverURL' " +
        "placeHolder='http://test-install.blindsidenetworks.com/bigbluebutton/api'></td></tr><tr><td>Security salt:</td><td>" +
        "<input type='text' id='BigBlueButton_securitySalt' placeHolder='8cd8ef52e8e101574e400365b55e11a6'></td></tr></table>" +
        "<button id='BigBlueButton_saveServerCredential'>Update credential</button></div>";

    var button = document.getElementById("BigBlueButton_saveServerCredential");
    button.onclick = AjxCallback.simpleClosure(this.saveServerCredential);
};


BigBlueButton_tab.prototype = new ZaTabView();
BigBlueButton_tab.prototype.constructor = BigBlueButton_tab;

BigBlueButton_tab.prototype.getTabTitle = function () {
    return "BigBlueButton";
};

BigBlueButton_tab.prototype.saveServerCredential = function() {
    var soapDoc = AjxSoapDoc.create("BigBlueButtonAdmin", "urn:BigBlueButtonAdmin");
    soapDoc.getMethod().setAttribute("action", "saveCredential");
    var csfeParams = new Object();
    csfeParams.soapDoc = soapDoc;
    csfeParams.asyncMode = true;
    csfeParams.callback = new AjxCallback(function() {
        console.log("successed");
    });
    csfeParams.errorCallback = new AjxCallback(function() {
        console.log("failed");
    })
    csfeParams.soapDoc.set("input", JSON.stringify({
        bigbluebutton_serverURL: document.getElementById("BigBlueButton_serverURL").value,
        bigbluebutton_securitySalt: document.getElementById("BigBlueButton_securitySalt").value
    }));
    var reqMgrParams = {} ;
    resp = ZaRequestMgr.invoke(csfeParams, reqMgrParams);
}
