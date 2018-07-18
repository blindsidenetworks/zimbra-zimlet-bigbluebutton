/* Create meeting */
BBB_Handler.CREATE_MEETING_PROPS = [BBB_Handler.STARTMEETING_MEETING_ID,
    BBB_Handler.MEETING_NAME, BBB_Handler.RECORDING];

BBB_Handler.prototype._displayStartMeetingDialog = function(attendees) {
    attendees = attendees ? attendees : [];
    BBB_Handler.prototype._handleGetMeetingIDResponse = function(response) {
        var result = response._data.BigBlueButtonResponse; // simplify typing
        if (result.result === "SUCCESSED") {
            this._displayStartMeetingDialogWithMeetingID(attendees, result.getRandomMeetingIDResult.meeting_id);
        } else {
            var title = this.getMessage("BigBlueButton_startMeetingFailed");
            var errMsg = this._startMeetingFailResponseDialog(result);
            var callback = function () {
                this.sendRequest("getRandomMeetingID", this._handleGetMeetingIDResponse);
            }
            this.displayErrorDlg(title, errMsg, callback);
        }
    }

    this.sendRequest("getRandomMeetingID", this._handleGetMeetingIDResponse);
}


BBB_Handler.prototype._startMeetingFailResponseDialog = function(response) {
    return ["<p>Start meeting failed with the following error message: <br/><br/>",
        response.error_message, "</p>"].join("");
};

BBB_Handler.prototype._displayStartMeetingDialogWithMeetingID = function(attendees, meetingID) {
    attendees = attendees ? attendees : []
    if (this.meetingDlg) {
        this.clearStartMeetingInputTable();
        this._setStartMeetingDlgButtonListener(meetingID);
        document.getElementById('bigbluebutton_startMeetingMeetingID').innerHTML = meetingID;
        this._addAttendeesToInputTable(attendees);
        this.meetingDlg.popup();
        return;
    }

    this._meetingDlgView = new DwtComposite(this.getShell());
    this._meetingDlgView.setSize("600", "500");
    this._meetingDlgView.getHtmlElement().style.overflow = "auto";
    this._meetingDlgView.getHtmlElement().innerHTML = "<form autocomplete='off'>" +
        this._createInputTable(BBB_Handler.CREATE_MEETING_PROPS) +
        this._createStartMeetingAttendeeInputTable() + "</form>";

    document.getElementById('bigbluebutton_startMeetingMeetingID').innerHTML = meetingID;

    var btn = new DwtButton({parent:this.getShell()});
    btn.setText(this.getMessage("BigBlueButton_startMeetingAddAttendeeFromContactList"));
    btn.addSelectionListener(new AjxListener(this, this._handlerAddAttendeeFromContact));
    document.getElementById("BBB_startMeetingAttendeeInputTable_selectFromContact").appendChild(btn.getHtmlElement());

    var params = {
        dataClass: appCtxt.getAutocompleter(),
        matchValue: ZmAutocomplete.AC_VALUE_EMAIL
    };
    const inputAutoComplete = new ZmAutocompleteListView(params);
    inputAutoComplete.handle(document.getElementById("BBB_startMeetingAttendeeList"));

    const startMeetingButtonID = Dwt.getNextId();
    const startMeetingButton = new DwtDialog_ButtonDescriptor(startMeetingButtonID,
        this.getMessage("BigBlueButton_startMeetingButton"), DwtDialog.ALIGN_RIGHT);

    const startJoinMeetingButtonID = Dwt.getNextId();
    const startJoinMeetingButton = new DwtDialog_ButtonDescriptor(startJoinMeetingButtonID,
        this.getMessage("BigBlueButton_startJoinMeetingButton"), DwtDialog.ALIGN_RIGHT);

    const cancelButtonID = Dwt.getNextId();
    const cancelButton = new DwtDialog_ButtonDescriptor(cancelButtonID,
        this.getMessage("BigBlueButton_cancelButton"), DwtDialog.ALIGN_RIGHT);

    BBB_Handler.prototype._setStartMeetingDlgButtonListener = function(meetingID) {
        this.meetingDlg.setButtonListener(startMeetingButtonID, new AjxListener(this, this.startMeeting, [meetingID, false]));
        this.meetingDlg.setButtonListener(startJoinMeetingButtonID, new AjxListener(this, this.startMeeting, [meetingID, true]));
    }

    this.meetingDlg = new ZmDialog({
        parent: this.getShell(),
        title: this.getMessage("BigBlueButton_startMeeting"),
        view: this._meetingDlgView,
        extraButtons: [startMeetingButton, startJoinMeetingButton, cancelButton],
        standardButtons: DwtDialog.NO_BUTTONS
    });

    this._addAttendeesToInputTable(attendees);
    this._setStartMeetingDlgButtonListener(meetingID);
    
    this.meetingDlg.setButtonListener(cancelButtonID, new AjxListener(this, function() {
        this.meetingDlg.popdown();
    }))
    this.meetingDlg.popup();
}

BBB_Handler.prototype.clearStartMeetingInputTable = function() {
    document.getElementById('BBB_startMeetingAttendeeList').value = "";
    this._clearInputTable(BBB_Handler.CREATE_MEETING_PROPS)
}

BBB_Handler.prototype._createStartMeetingAttendeeInputTable = function() {
    var html = [];
    html.push("<div>");
    html.push("<b>Selected attendees:</b><br>");
    html.push("<input style='width: 400px' type='text' id='BBB_startMeetingAttendeeList' />");
    html.push("<div width='50%' id='BBB_startMeetingAttendeeInputTable_selectFromContact'></div>");
    html.push("</div>");
    return html.join("");
}

BBB_Handler.prototype._addAttendeesToInputTable = function(attendeesArr) {
     var uniqueAttendees = this._getUniqueAddresses();
    for (var i = 0; i < attendeesArr.length; ++i) {
        this._handlerAddMeetingAttendeeInput(attendeesArr[i].email);
    }
}

BBB_Handler.prototype._handlerAddMeetingAttendeeInput = function(email) {
    email = typeof(email) === 'string' ? email : "";
    var field = document.getElementById('BBB_startMeetingAttendeeList');
    if (!AjxEmailAddress.isValid(email) || field.value.indexOf(email) != -1) {
        return;
    }
    field.value += email + AjxEmailAddress.SEPARATOR;
}

BBB_Handler.prototype._handlerAddAttendeeFromContact = function() {
    if (!this._contactPicker) {
        var buttonInfo = [{id:AjxEmailAddress.TO, label : ZmMsg[AjxEmailAddress.TYPE_STRING[AjxEmailAddress.TO]]}];
        this._contactPicker = new ZmContactPicker(buttonInfo);
    }
    this._contactPicker.registerCallback(DwtDialog.OK_BUTTON, this._addAttendeeContactSelectedCallBack, this);
    this._contactPicker.popup();
}

BBB_Handler.prototype._addAttendeeContactSelectedCallBack = function(contactVec) {
    this._contactPicker.popdown();

    var uniqueAttendees = this._getUniqueAddresses();
    var contactArr = contactVec.getArray();
    for (var i = 0; i < contactArr.length; ++i) {
        this._handlerAddMeetingAttendeeInput(contactArr[i].getAddress());
    }
}

BBB_Handler.prototype._getUniqueAddresses = function() {
    var field = document.getElementById('BBB_startMeetingAttendeeList');
    var val = field.value;
    var parsed = AjxEmailAddress.parseEmailString(val);
    return new Set(parsed.good.getArray());
}

BBB_Handler.prototype.startMeeting = function(meetingID, autoJoinMeeting) {
    var input = this._getInput(BBB_Handler.CREATE_MEETING_PROPS);
    input["bigbluebutton_meetingID"] = meetingID;
    BBB_Handler.prototype.handleUpdateMeetingResponse = function(response) {
        var result = response._data.BigBlueButtonResponse; // simplify typing
        if (result.result === "SUCCESSED") {
            this.meetingDlg.popdown();
            this.sendEmailToAttendees(meetingID, this._getUniqueAddresses());
            if (autoJoinMeeting == true) {
                window.open(result.updateMeetingResult.join_url, "_blank")
            } else {
                if (!this.responseDlg) {
                    this._responseDlgView = new DwtComposite(this.getShell());
                    this._responseDlgView.setSize("600", "500");
                    this._responseDlgView.getHtmlElement().style.overflow = "auto";
                    this._responseDlgView.getHtmlElement().innerHTML = "<p id='BigBlueButton_startMeetingSuccessedDlgMsg'></p>";
                    
                    this.responseDlg = new ZmDialog({
                        parent: this.getShell(),
                        title: this.getMessage("BigBlueButton_startMeetingSuccessed"),
                        view: this._responseDlgView,
                        standardButtons: [DwtDialog.OK_BUTTON]
                    });
                    this.responseDlg.setButtonListener(DwtDialog.OK_BUTTON, new AjxListener(this, function() {
                        this.responseDlg.popdown();
                    }));
                }
                document.getElementById("BigBlueButton_startMeetingSuccessedDlgMsg").innerHTML =
                    this._startMeetingSuccessResponseDialog(meetingID);
                this.responseDlg.popup();
            }
        } else {
            var title = this.getMessage("BigBlueButton_startMeetingFailed");
            var errMsg = this._startMeetingFailResponseDialog(result);
            var callback = function () { }
            this.displayErrorDlg(title, errMsg, callback);
        }
    }

    this.sendRequest("createMeeting", this.handleUpdateMeetingResponse, input);
}

BBB_Handler.prototype._startMeetingSuccessResponseDialog = function(meeting_id) {
    var input = {
        request: "joinMeeting",
        bigbluebutton_meetingID: meeting_id
    }
    return ["<p>Invitation sent successfully. Click <a href='",
        this._getURL(input),
        "' target='_blank'>here</a> to join the meeting</p>"].join("");
};


BBB_Handler.prototype._sendRemaiderEmailFailResponseDialog = function(response) {
    return ["<p>Send remaider email failed with the following error message: <br/><br/>",
        response.error_message, "</p>"].join("");
};

BBB_Handler.prototype.sendEmailToAttendees = function(meeting_id, emailSet) {
    this._sendEmailFailedContacts = new Set();
    var emails = Array.from(emailSet);
    for (var i = 0; i < emails.length; ++i) {
        this.sendInviteMeetingEmail(emails[i].getAddress(), meeting_id);
    }

    this.sendRemainderEmail(meeting_id); // send an email to the creator for reference
}

BBB_Handler.prototype.sendRemainderEmail = function(meeting_id) {
    var callback = new AjxCallback(this, function(){ }); // on success, do nothing
    var errCallback = new AjxCallback(this, function(){
        var title = this.getMessage("BigBlueButton_sendRemaiderEmailFailed");
        var errMsg = this._sendRemaiderEmailFailResponseDialog(result);
        var callback = function () {
            this.sendRemainderEmail(meeting_id);
        }
        this.displayErrorDlg(title, errMsg, callback);
    });

    var subject = "You created BigBlueButton meeting: " + meeting_id;
    var type = "text/html";
    var input = {
        request: "joinMeeting",
        bigbluebutton_meetingID: meeting_id
    }
    var endMeetingInput = {
        request: "endMeeting",
        bigbluebutton_meetingID: meeting_id
    }
    var content = ["<html><head><style type='text/css'>p { margin: 0; }</style></head>",
        "<body><div style='font-family: Times New Roman; font-size: 12pt; color: #000000'>",
        "<p>You created BBB meeting:<br/>", meeting_id, "<br/><br/>Click <a href='",
        this._getURL(input),
        "' target='_blank'>here</a> to join the meeting.<br/><br/>",
        "Click <a href='", this._getURL(endMeetingInput), "' target='_blank'>",
        "here</a> to end the meeting.</p>",
        "</div></body></html>"].join("");

    return this.sendEmail(subject, this.email, this.displayName, type, content, callback, errCallback);
}

BBB_Handler.prototype.sendInviteMeetingEmail = function(email, meeting_id) {
    // do not send the invite email to the creator
    if (email === this.email)
        return;

    var callback = new AjxCallback(this, function(){ }); // on success, do nothing
    var errCallback = new AjxCallback(this, function() {
        this._sendEmailFailedContacts.add(email);
        var title = this.getMessage("BigBlueButton_sendEmailFailed");
        var errMsg = this._getSendEmailFailedHTML(meeting_id);
        this.displayErrorDlg(title, errMsg, function() { });
    }.bind(this));

    var displayName = this.displayName;
    var subject = "Invitation to BigBlueButton meeting: " + meeting_id + (displayName ? " from " + displayName : "");
    var name = email.substring(0, email.indexOf("@"));
    var type = "text/html";
    var input = {
        request: "joinMeeting",
        bigbluebutton_meetingID: meeting_id
    }

    var content = ["<html><head><style type='text/css'>p { margin: 0; }</style></head>",
        "<body><div style='font-family: Times New Roman; font-size: 12pt; color: #000000'>",
        "<p>You received invitation to BigBlueButton meeting:<br/>", meeting_id, "<br/>Click <a href='",
        this._getURL(input),
        "' target='_blank'>here</a> to join the meeting.</p>","</div></body></html>"].join("");

    return this.sendEmail(subject, email, name, type, content, callback, errCallback);
}

BBB_Handler.prototype._getSendEmailFailedHTML = function(meeting_id) {
    return ["<p>Failed to send invitation email to<br/>",
            Array.from(this._sendEmailFailedContacts).join("<br/>"),
            "<br/>Please send the meeting id: ", meeting_id, " again.</p>"].join("");
}
