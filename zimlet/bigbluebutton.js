/**
 * Main file for bigbluebutton zimlet handler object
 * More information for ZmZimletBase can be found here
 * https://barrydegraaff.github.io/jsapi-zimbra-doc860/symbols/ZmZimletBase.html
 * 
 * @author Yunkai Wang
 */

function com_zimbra_bigbluebutton_HandlerObject() { } /* constructor */

com_zimbra_bigbluebutton_HandlerObject.prototype = new ZmZimletBase();
com_zimbra_bigbluebutton_HandlerObject.prototype.constructor = com_zimbra_bigbluebutton_HandlerObject;

var BBB_Handler = com_zimbra_bigbluebutton_HandlerObject; /* simplify handler object */

BBB_Handler.MEETING_ID = {propId: "bigbluebutton_meetingID", label: "BigBlueButton_meetingID", inputType: "text",
                          defaultVal: "", required: true, warningID: "bigbluebutton_meetingIDWarning"};

BBB_Handler.MEETING_NAME = {propId: "bigbluebutton_meetingName", label: "BigBlueButton_meetingName", inputType: "text",
                            defaultVal: "", required: false};

BBB_Handler.RECORDING = {propId: "bigbluebutton_recording", label: "BigBlueButton_recording", inputType: "radio",
                         defaultVal: "no", values: ["yes", "no"]};

BBB_Handler.UPDATE_RECORD = {propId: "bigbluebutton_manageRecording", label: "BigBlueButton_manageRecording", inputType: "radio",
                             defaultVal: "publish", values: ["publish", "unpublish", "delete", "update"]};

BBB_Handler.DISPLAY_NAME = {propId: "bigbluebutton_displayName", label: "BigBlueButton_displayName", inputType: "text",
                            defaultVal: "", required: false};

BBB_Handler.SHOW_INVITATION = {propId: "bigbluebutton_showInvitation", label: "BigBlueButton_showInvitation", inputType: "radio",
                               defaultVal: "yes", values: ["yes", "no"]};

BBB_Handler.prototype.init = function() {
    this.displayName = appCtxt.getActiveAccount().getDisplayName();
    this.email = appCtxt.getActiveAccount().getEmail();
    this.loadOldPreference();
}

BBB_Handler.prototype.singleClicked = function() {
  this._displayJoinMeetingDialog();
}

// create button for BigBlueButton in the tool bar,
BBB_Handler.prototype.initializeToolbar = function(app, toolbar, controller, viewId) {
    // create meeting from appointment, see bigbluebutton_appointment.js for more details
    if (viewId.indexOf("APPT") != -1) {
        this._displayBigBlueButtonApptBar(toolbar, controller, viewId.indexOf("APPTRO") == -1 ? true : false);
    } else if (viewId === "CNS-main" || viewId === "CLV-main" || viewId === "TV-main" || viewId.indexOf("CV") != -1 ||
               viewId.indexOf("CLV-SR") != -1) {
        var op = toolbar.getOp(ZmId.OP_ACTIONS_MENU);
        if (op) {
        var menu = op.getMenu();
        if (menu) {
            if (menu.getMenuItem("BigBlueButton_createMeeting"))
                return;

            var menuItem = menu.createMenuItem("BigBlueButton_createMeeting", {
                image: "bigbluebutton-panelIcon",
                text: this.getMessage("BigBlueButton_createQuickMeeting")
            });
            menuItem.addSelectionListener(new AjxListener(this, this._handleMenuClick, controller));
        }
        }
    } else if (viewId.indexOf("COMPOSE") != -1) {
        this._displayBigBlueButtonEmailBar(toolbar, controller);
    }
};

// called when the button in the action menu is clicked
BBB_Handler.prototype._handleMenuClick = function(controller) {
    var emails = [];
    var selectedItems = controller.getSelection();

    for (var i = 0; i < selectedItems.length; ++i) {
        var item = selectedItems[i];
        if (item instanceof ZmConv) {
            var participants = item.participants;
            if (!(participants instanceof Array)) {
                participants = participants.getArray();
            }
            for (var j = 0; j < participants.length; ++j) {
                var participant = participants[j];
                emails.push({email: participant.getAddress()});
            }
        } else if (item instanceof ZmContact) {
            emails.push({email: item.attr.email});
        }
    }
    this._displayCreateMeetingDialog(emails); // locate in bigbluebutton_createMeeting.js
}


// called when an item is dropped on the bigbluebutton Zimlet in the panel
BBB_Handler.prototype.doDrop = function(droppedItem) {
    this.handleDrop(droppedItem); // handle dropped item, see bigbluebutton_handleDrop.js for more details
};

BBB_Handler.prototype.menuItemSelected = function(itemId) {
    switch(itemId) {
        case "START_MEETING":
            this._displayCreateMeetingDialog(); // see bigbluebutton_createMeeting.js for more details
            break;
        case "JOIN_MEETING":
            this._displayJoinMeetingDialog(); // see bigbluebutton_joinMeeting.js for more details
            break;
        case "MANAGE_RECORDING":
            this._displayManageRecordingDialog(); // see bigbluebutton_manageRecording.js for more details
            break;
        case "VIEW_RECORDING": 
            this._displayViewRecordingDialog(); // see bigbluebutton_viewRecording.js for more details
            break;
        case "GET_MEETING_SUMMARY": 
            this._displayGetMeetingSummaryDialog(); // see bigbluebutton_viewRecording.js for more details
            break;
        case "CONFIG_PREFERENCE":
            this._displayConfigPreferenceDialog(); // see bigbluebutton_preference.js for more details
            break;
        case "END_MEETING":
            this._displayEndMeetingDialog(); // see bigbluebutton_endMeeting.js for more details
            break;
    }
}

// Helper function for sending SOAP request to the server
BBB_Handler.prototype.sendRequest = function(action, callback, input, errorCallback) {
    var params = {};
    params.soapDoc = AjxSoapDoc.create("BigBlueButton", "urn:BigBlueButton");
    params.soapDoc.set("action", action);
    params.asyncMode = true;
    params.noBusyOverlay = true;
    params.callback = new AjxCallback(this, function(response) {
        if (callback) {
            callback = callback.bind(this);
            callback(response);
        }
    });
    params.errorCallback = new AjxCallback(this, function(response) {
        if (errorCallback) {
            errorCallback = errorCallback.bind(this);
            errorCallback(response);
        }
    });
    params.soapDoc.set("input", input ? JSON.stringify(input) : "{}");
    appCtxt.getAppController().sendRequest(params);
}

// Helper function for displaying an error window
BBB_Handler.prototype.displayErrorDlg = function(title, errorMsg, okButtonCallback) {
    okButtonCallback = okButtonCallback.bind(this);
    var callback = new AjxListener(this, function() {
        this._errorDlg.popdown();
        okButtonCallback();
    });
    if (this._errorDlg) {
        this._errorDlg.setTitle(title);
        document.getElementById("BigBlueButton_errorDlgMsg").innerHTML = errorMsg;
        this._errorDlg.setButtonListener(DwtDialog.OK_BUTTON, callback);
        this._errorDlg.popup();
        return;
    }
    this._errorDlgView = new DwtComposite(this.getShell());
    this._errorDlgView.setSize("600", "500");
    this._errorDlgView.getHtmlElement().style.overflow = "auto"
    this._errorDlgView.getHtmlElement().innerHTML = "<div style='width: 300px'><p id='BigBlueButton_errorDlgMsg'></p></div>";
    document.getElementById("BigBlueButton_errorDlgMsg").innerHTML = errorMsg;
    this._errorDlg = new ZmDialog({
        parent: this.getShell(),
        title: title,
        view: this._errorDlgView,
        standardButtons: [DwtDialog.OK_BUTTON, DwtDialog.CANCEL_BUTTON]
    });
    this._errorDlg.setButtonListener(DwtDialog.OK_BUTTON, callback);
    this._errorDlg.popup();
}

// Helper function for sending an email
BBB_Handler.prototype.sendEmail = function(subject, toAddress, displayName, type, content, callback, errorCallback) {
    var jsonObj = {SendMsgRequest:{_jsns:"urn:zimbraMail"}};
    var request = jsonObj.SendMsgRequest;
    request.suid = (new Date()).getTime();
    var msgNode = request.m = {};
    var identity = appCtxt.getIdentityCollection().defaultIdentity;
    msgNode.idnt = identity.id;

    var addrNodes = msgNode.e = [];
    var fromNode = {t: "f", a: this.email};
    fromNode.p = this.displayName;
    addrNodes.push(fromNode);

    var toNode = {t: "t", a: toAddress};
    toNode.p = displayName;
    addrNodes.push(toNode);

    var topNode = {ct: "multipart/alternative"};
    msgNode.su = {_content: subject};
    msgNode.mp = [topNode];
    var partNodes = topNode.mp = [];

    var partNode = {ct:type};
    partNode.content = {_content:content};
    partNodes.push(partNode);

    return appCtxt.getAppController().sendRequest({
        jsonObj:jsonObj,
        asyncMode:true,
        noBusyOverlay:true,
        errorCallback:errorCallback,
        callback:callback
    });
}

// Helper function for getting all user input
BBB_Handler.prototype._getInput = function(PROPS, prefix) {
    prefix = prefix ? prefix : "";
    var input = {};
    for (var i = 0; i < PROPS.length; ++i) {
        var prop = PROPS[i];
        var key = prop.propId;
        if (prop.inputType === 'text') {
            var val = document.getElementById(prefix + key).value;
            if (val != "")
                input[key] = val;
        } else if (prop.inputType === 'radio') {
            for (var j = 0; j < prop.values.length; ++j) {
                var value = prop.values[j];
                if (document.getElementById(prefix + prop.propId + "_" + value).checked) {
                    input[key] = value;
                    break;
                }
            }
        }
    } 
    return input;
}

// Helper function for creating input table
BBB_Handler.prototype._createInputTable = function(PROPS, prefix) {
    prefix = prefix ? prefix : "";
    var html = [];

    html.push("<table class='bigbluebutton_table'>");
    for (var i = 0; i < PROPS.length; ++i) {
        var prop = PROPS[i];
        if (prop.inputType === "text") {
            html.push("<tr><td>", this.getMessage(prop.label), "</td><td><input id='", prefix, prop.propId, "' type='text'/>");
            if (prop.required) {
                html.push("<td><p id='" + prop.warningID + "' style='color:red;display:none;'>&nbsp;Required!</p></td></tr>");
            } else {
                html.push("</td></tr>");
            }
        } else if (prop.inputType === "radio") {
            html.push("<tr><td>", this.getMessage(prop.label), "</td><td>");
            for (var j = 0; j < prop.values.length; ++j) {
                var value = prop.values[j];
                html.push("<input name='", prop.propId, "' id='", prefix, prop.propId, "_", value, "' value='", value, "' type='radio' ");
                if (value === prop.defaultVal) {
                    html.push("checked");
                }
                html.push("/><label for='", prop.propId, "_", value, "'>", value, "</label>");
            }
            html.push("</td></tr>")
        }
    }

    html.push("</table>");
    return html.join("");
}

// Helper function to get url that sends request to the server extension
BBB_Handler.prototype._getURL = function(input) {
    var urlEncodedDataPairs = [];

    for (var name in input) {
        urlEncodedDataPairs.push(encodeURIComponent(name) + '=' + encodeURIComponent(input[name]));
    }

    var baseURL = "https://" + window.location.hostname + "/service/extension/BigBlueButtonExt/BigBlueButton?";
    return encodeURI(baseURL + urlEncodedDataPairs.join('&'))
}

BBB_Handler.prototype.displayConfirmationDialog = function(title, content, okButtonCallback, cancelButtonCallback) {
    okButtonCallback = okButtonCallback.bind(this);
    var okCallback = new AjxListener(this, function() {
        this._confirmDlg.popdown();
        okButtonCallback();
    });
    cancelButtonCallback = cancelButtonCallback.bind(this);
    var cancelCallback = new AjxListener(this, function() {
        this._confirmDlg.popdown();
        cancelButtonCallback();
    });
    if (this._confirmDlg) {
        this._confirmDlg.setTitle(title);
        document.getElementById("BigBlueButton_confirmDlgMsg").innerHTML = content;
        this._confirmDlg.setButtonListener(DwtDialog.OK_BUTTON, okCallback);
        this._confirmDlg.setButtonListener(DwtDialog.CANCEL_BUTTON, cancelCallback);
        this._confirmDlg.popup();
        return;
    }

    this._confirmDlgView = new DwtComposite(this.getShell());
    this._confirmDlgView.setSize("600", "500");
    this._confirmDlgView.getHtmlElement().style.overflow = "auto"
    this._confirmDlgView.getHtmlElement().innerHTML = "<div style='width: 300px'><p id='BigBlueButton_confirmDlgMsg'></p></div>";
    document.getElementById("BigBlueButton_confirmDlgMsg").innerHTML = content;
    this._confirmDlg = new ZmDialog({
        parent: this.getShell(),
        title: title,
        view: this._confirmDlgView,
        standardButtons: [DwtDialog.OK_BUTTON, DwtDialog.CANCEL_BUTTON]
    });
    this._confirmDlg.setButtonListener(DwtDialog.OK_BUTTON, okCallback);
    this._confirmDlg.setButtonListener(DwtDialog.CANCEL_BUTTON, cancelCallback);
    this._confirmDlg.popup();
}