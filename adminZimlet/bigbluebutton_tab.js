BigBlueButton_tab = function(parent, appCtxt) {
    ZaTabView.call(this, parent,"BigBlueButton_tab");
    ZaTabView.call(this, {
        parent:parent,
        iKeyName:"BigBlueButton_tab",
        contextId:"BigBlueButton"
    });
    this._appCtxt = appCtxt;
    this.setScrollStyle(Dwt.SCROLL);
    this.getServerCredential();

    document.getElementById('ztab__BigBlueButton').innerHTML = "<div style='padding-left:10px'><h1>BigBlueButton server configuration</h1>" +
        "Update credentials for BigBlueButton server that your Zimbra server is currently connected to.<br>Click <a " +
        "href='https://bigbluebutton.org/' target='_blank'>here</a> if you want to know more about BigBlueButton." +
        "<br><br><b style='display:none' id='BigBlueButton_credentialNotSavedWarning'>" +
        "WARNING: The changes you made have not been saved, please save them " +
        "by clicking the 'Update credential' button or click 'Reset credential' to reset the credentials.</b><br>" +
        "<table><tr><td>Server URL:</td><td><input type='text' id='BigBlueButton_serverURL' title='http(s)://{bigbluebutton_server_url}/" +
        "bigbluebutton/api/' style='width: 400px;'></td></tr><tr><td>Security salt:</td><td>" +
        "<input type='text' id='BigBlueButton_securitySalt' style='width: 400px;'></td></tr></table>" +
        "<button id='BigBlueButton_saveServerCredential' title='Update credential'>Update credential</button>" +
        "<button id='BigBlueButton_resetServerCredential' title='Recover old credential'>Reset credential</button></div>";

    var saveButton = document.getElementById("BigBlueButton_saveServerCredential");
    saveButton.onclick = AjxCallback.simpleClosure(this.saveServerCredential, this);

    var resetButton = document.getElementById("BigBlueButton_resetServerCredential");
    resetButton.onclick = AjxCallback.simpleClosure(this.resetServerCredential, this);
};


BigBlueButton_tab.prototype = new ZaTabView();
BigBlueButton_tab.prototype.constructor = BigBlueButton_tab;

BigBlueButton_tab.prototype.getTabTitle = function () {
    return "BigBlueButton";
};

BigBlueButton_tab.prototype.getServerCredential = function() {
    var soapDoc = AjxSoapDoc.create("BigBlueButtonAdmin", "urn:BigBlueButtonAdmin");
    soapDoc.getMethod().setAttribute("action", "getCredential");
    var csfeParams = new Object();
    csfeParams.soapDoc = soapDoc;
    csfeParams.asyncMode = true;
    csfeParams.callback = new AjxCallback(this, function(response) {
        var result = response._data.Body.BigBlueButtonResponse; // simplify typing
        if (result.result === "SUCCESSED") {
            document.getElementById("BigBlueButton_serverURL").value = result.bigbluebutton_serverURL;
            document.getElementById("BigBlueButton_securitySalt").value = result.bigbluebutton_securitySalt;
        } else {
            document.getElementById("BigBlueButton_serverURL").value = ZaItem.ZaItem.BIGBLUEBUTTON_DEFAULT_SALT;
            document.getElementById("BigBlueButton_securitySalt").value = ZaItem.BIGBLUEBUTTON_DEFAULT_SALT;
        }
        this._serverURL  = document.getElementById("BigBlueButton_serverURL").value;
        this._serverSalt = document.getElementById("BigBlueButton_securitySalt").value;
    });

    var reqMgrParams = {} ;
    resp = ZaRequestMgr.invoke(csfeParams, reqMgrParams);
}

BigBlueButton_tab.prototype.resetServerCredential = function() {
    document.getElementById("BigBlueButton_serverURL").value = this._serverURL;
    document.getElementById("BigBlueButton_securitySalt").value = this._serverSalt;
    this._hideCredentialNotSavedWarning();
}

BigBlueButton_tab.prototype._hideCredentialNotSavedWarning = function() {
    document.getElementById("BigBlueButton_credentialNotSavedWarning").style.display = "none";
}

BigBlueButton_tab.prototype._displayCredentialNotSavedWarning = function() {
    document.getElementById("BigBlueButton_credentialNotSavedWarning").style.display = "inline";
}

BigBlueButton_tab.prototype.saveServerCredential = function() {
    var soapDoc = AjxSoapDoc.create("BigBlueButtonAdmin", "urn:BigBlueButtonAdmin");
    soapDoc.getMethod().setAttribute("action", "saveCredential");
    var csfeParams = new Object();
    csfeParams.soapDoc = soapDoc;
    csfeParams.asyncMode = true;
    csfeParams.callback = new AjxCallback(this, function(response) {
        var result = response._data.Body.BigBlueButtonResponse; // simplify typing
        if (result.result === "SUCCESSED") {
            this._appCtxt.getAppController().setActionStatusMsg("Update credential successed.", ZaActionStatusView.LEVEL_INFO);
            this._serverURL = document.getElementById("BigBlueButton_serverURL").value;
            this._serverSalt = document.getElementById("BigBlueButton_securitySalt").value;
            this._hideCredentialNotSavedWarning();
        } else {
            this._displayErrorDialog("Failed to update credential since: " + result.error_message);
        }
    });
    csfeParams.errorCallback = new AjxCallback(this, function() {
        this._displayErrorDialog("Failed to update credential");
    })
    csfeParams.soapDoc.set("input", JSON.stringify({
        bigbluebutton_serverURL: document.getElementById("BigBlueButton_serverURL").value,
        bigbluebutton_securitySalt: document.getElementById("BigBlueButton_securitySalt").value
    }));
    var reqMgrParams = {} ;
    resp = ZaRequestMgr.invoke(csfeParams, reqMgrParams);
}

BigBlueButton_tab.prototype._displayErrorDialog = function(errorMsg) {
    if (this._errorDlg) {
        document.getElementById("BigBlueButton_errorDlgMsg").innerHTML = errorMsg;
        this._errorDlg.popup();
        return;
    }
    this._errorDlgView = new DwtComposite(this.shell);
    this._errorDlgView.setSize("600", "500");
    this._errorDlgView.getHtmlElement().style.overflow = "auto"
    this._errorDlgView.getHtmlElement().innerHTML = "<div style='width: 300px'><p id='BigBlueButton_errorDlgMsg'></p></div>";
    document.getElementById("BigBlueButton_errorDlgMsg").innerHTML = errorMsg;

    this._errorDlg = new DwtDialog({
        parent: this.shell,
        title: "ERROR",
        view: this._errorDlgView,
        standardButtons: [DwtDialog.OK_BUTTON]
    });

    this._errorDlg.setButtonListener(DwtDialog.OK_BUTTON, new AjxListener(this, function() {
        this._displayCredentialNotSavedWarning();
        this._errorDlg.popdown();
    }));
    this._errorDlg.popup();
}
