
BBB_Handler.USER_PREFERENCE = [BBB_Handler.DISPLAY_NAME];

BBB_Handler.prototype.loadOldPreference = function() {
    this.sendRequest("getPreference", this.handleGetPreferenceResponse, {});
}

BBB_Handler.prototype.handleGetPreferenceResponse = function(response) {
    var result = response._data.BigBlueButtonResponse; // simplify typing
    if (result.result === "SUCCESSED") {
        this.displayName = result.getPreferenceResult.displayName;
    }
}

BBB_Handler.prototype._displayConfigPreferenceDialog = function() {
    if (this.configPreferenceDlg) {
        this.configPreferenceDlg.popup();
        return;
    }

    this._configPreferenceDlgView = new DwtComposite(this.getShell());
    this._configPreferenceDlgView.setSize("600", "500");
    this._configPreferenceDlgView.getHtmlElement().style.overflow = "auto";
    this._configPreferenceDlgView.getHtmlElement().innerHTML = this._createInputTable(BBB_Handler.USER_PREFERENCE);
    document.getElementById("bigbluebutton_displayName").value = this.displayName;

    this.configPreferenceDlg = new ZmDialog({
        parent: this.getShell(),
        title: this.getMessage("BigBlueButton_updatePreference"),
        view: this._configPreferenceDlgView,
        standardButtons: [DwtDialog.OK_BUTTON, DwtDialog.CANCEL_BUTTON]
    });
    this.configPreferenceDlg.setButtonListener(DwtDialog.OK_BUTTON, new AjxListener(this, this.updatePreference));
    this.configPreferenceDlg.popup();
}

BBB_Handler.prototype.updatePreference = function() {
    var input = this._getInput(BBB_Handler.USER_PREFERENCE);
    this.configPreferenceDlg.popdown();
    this.sendRequest("updatePreference", this.handleUpdatePreferenceResponse, input);
};

BBB_Handler.prototype.handleUpdatePreferenceResponse = function(response) {
    var result = response._data.BigBlueButtonResponse; // simplify typing
    if (result.result === "SUCCESSED") {
        appCtxt.getAppController().setStatusMsg(this.getMessage("BigBlueButton_preferenceUpdated"), ZmStatusView.LEVEL_INFO);
        this.displayName = result.updatePreferenceResult.displayName;
    } else {
        var title = this.getMessage("BigBlueButton_updatePreferenceFailed");
        var errMsg = this._updatePreferenceFailResponseDialog(result);
        var callback = function () {
            this.configPreferenceDlg.popup();
        }
        this.displayErrorDlg(title, errMsg, callback);
    }
};

BBB_Handler.prototype._updatePreferenceFailResponseDialog = function(response) {
    return ["<p>Update preference failed with the following error message: <br/><br/>",
        response.error_message,
        "<br/><br/>Click 'OK' to try again.</p>"].join("");
};
