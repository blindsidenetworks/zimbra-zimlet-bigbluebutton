BBB_Handler.prototype.onShowView = function(viewId) {
    if (viewId.indexOf("APPT") != -1 && viewId.indexOf("APPTRO") == -1) {
        var composeView = appCtxt.getCurrentView();
        setTimeout((function(_this) {
            return function() {
                try {
                    var div = document.getElementById(composeView.__internalId).children[0];
                    var id = div.id;

                    var count = id.substring(id.lastIndexOf("zcs") + 3);
                    var table = document.getElementById("zcs" + count + "_table");
                    if (!table) {
                        table = document.getElementById("zcs" + count + "_top").getElementsByTagName('table')[0];
                    }
                } catch (err) {
                    return; // cannot get table successfully
                }

                if (document.getElementById("BigBlueButton_appointment_insertMeeting_" + count)) {
                    table.deleteRow(document.getElementById("BigBlueButton_appointment_insertMeeting_" + count).rowIndex);
                }
                var row = table.insertRow(document.getElementById("zcs" + count + "_meetingInPastWarning").rowIndex);
                row.id = "BigBlueButton_appointment_insertMeeting_" + count;
                var cell1 = row.insertCell(0);
                var cell2 = row.insertCell(1);
                cell2.innerHTML = "<div id='BigBlueButton_appointment_insertMeeting_" + count + "_btn' />";
                var btn = new DwtButton({parent:_this.getShell()});

                
                var currentContent = composeView.getHtmlEditor().getContent();
                if (currentContent.indexOf("BigBlueButton meeting has been created for this appointment.") == -1) {
                    btn.setText(_this.getMessage("BigBlueButton_appointmentInsertMeetingBtn"));
                    btn.addSelectionListener(new AjxListener(_this, function() {
                        var callback = function() {
                            btn.setText(_this.getMessage("BigBlueButton_appointmentJoinMeetingBtn"));
                            btn.removeSelectionListeners();
                            btn.addSelectionListener(new AjxListener(_this, function() {
                                _this._joinMeetingFromAppt(_this);
                            }))
                        }
                        _this._insertMeetingDetails(_this, false, callback);
                    }));
                } else {
                    btn.setText(_this.getMessage("BigBlueButton_appointmentJoinMeetingBtn"));
                    btn.removeSelectionListeners();
                    btn.addSelectionListener(new AjxListener(_this, function() {
                        _this._joinMeetingFromAppt(_this);
                    }))
                }
                document.getElementById("BigBlueButton_appointment_insertMeeting_" + count + "_btn").appendChild(btn.getHtmlElement());
            } 
        })(this), 0)
    }
}


BBB_Handler.prototype._displayBigBlueButtonApptBar = function(toolbar, controller, isOrganizer) {
    if (!toolbar.getButton("BIGBLUEBUTTON")) {
        var buttonIndex = toolbar.opList.length + 1;
        var button = toolbar.createOp("BIGBLUEBUTTON", {text: this.getMessage("label"),
                                                        tooltip: this.getMessage("BigBlueButton_bigBlueButtonTip"),
                                                        index: buttonIndex});
        toolbar.addOp("BIGBLUEBUTTON", buttonIndex);

        var menu = new ZmPopupMenu(button);
        button.setMenu(menu);
        var createMeeting = menu.createMenuItem(Dwt.getNextId(), {image: "bigbluebutton-panelIcon", text: this.getMessage("BigBlueButton_joinMeetingFromAppt")});
        createMeeting.addSelectionListener(new AjxListener(controller, this._joinMeetingFromAppt, this));
        if (isOrganizer) {
            var insertMeetingDetail = menu.createMenuItem(Dwt.getNextId(), {image: "bigbluebutton-panelIcon", text: this.getMessage("BigBlueButton_insertMeetingDetails")});
            insertMeetingDetail.addSelectionListener(new AjxListener(controller, this._insertMeetingDetails, [this, false]));

            var insertMeetingDetail = menu.createMenuItem(Dwt.getNextId(), {image: "bigbluebutton-panelIcon", text: this.getMessage("BigBlueButton_insertMeetingDetailsAndSave")});
            insertMeetingDetail.addSelectionListener(new AjxListener(controller, this._insertMeetingDetails, [this, true]));

            var endMeeting = menu.createMenuItem(Dwt.getNextId(), {image: "bigbluebutton-panelIcon", text: this.getMessage("BigBlueButton_endMeetingForAppt")});
            endMeeting.addSelectionListener(new AjxListener(controller, this._endMeetingForAppt, this));
        }
    }
}

BBB_Handler.prototype.sendJoinApptMeetingReq = function(appt, _this) {
    _this.appt = appt;
    var input = {};
    input["bigbluebutton_meetingName"] = appt.name;
    input["appointment_uid"] = appt.uid;
    input["appointment_organizer"] = appt.organizer ? appt.organizer : _this.email;

    _this.sendRequest("joinApptMeeting", _this.handleJoinApptMeetingResponse, input);
}

BBB_Handler.prototype._joinMeetingFromAppt = function(_this) {
    var composeView = appCtxt.getCurrentView();
    var appt = composeView._calItem ? composeView._calItem : composeView.getAppt();
    _this.sendJoinApptMeetingReq(appt, _this);
}

BBB_Handler.prototype.handleJoinApptMeetingResponse = function(response) {
    var result = response._data.BigBlueButtonResponse; // simplify typing
    if (result.result === "SUCCESSED") {
        window.open(result.joinApptMeetingURLResult.join_url, '_blank');
    } else {
        var title = this.getMessage("BigBlueButton_joinMeetingFailed");
        var errMsg = this.getJoinMeetingFailedHTML(result);
        var okButtonCallback = function () {
          this.sendJoinApptMeetingReq(this.appt, this);
        }
        this.displayErrorDlg(title, errMsg, okButtonCallback);
    }
}

BBB_Handler.prototype._endMeetingForAppt = function(_this) {
    var input = {};
    var appt = appCtxt.getCurrentView().getAppt();
    input["appointment_uid"] = appt.uid;
    input["appointment_organizer"] = appt.organizer ? appt.organizer : _this.email;

    BBB_Handler.prototype.displayEndApptMeetingConfirmationWindow = function(response) {
        var result = response._data.BigBlueButtonResponse; // simplify typing
        if (result.result === "SUCCESSED") {
            var participantCount = result.getNumAttendeeForApptMeetingResult.participantCount;
            var title = _this.getMessage("BigBlueButton_endMeetingConfirmTitle");
            var content = "<b>WARNING</b><br/>There are " + participantCount + " users currently in the " +
                "meeting, they will be logged out if you end this meeting.<br/><br/>Are you sure you want to " +
                "end this meeting? (Click 'ok' to end the meeting)"
            var okCallback = function() {
                _this.sendRequest("endApptMeeting", _this.handleEndApptMeetingResponse, input);
            }
            var cancelCallback = function() { }

            _this.displayConfirmationDialog(title, content, okCallback, cancelCallback);
        } else {
            var title = _this.getMessage("BigBlueButton_endMeetingForApptFailed");
            var errMsg = "<p>Failed to end the meeting since the following error message:<br/>"
                         + result.error_message + "</p>";
            var okButtonCallback = function () {
              _this._endMeetingForAppt(_this);
            }
            _this.displayErrorDlg(title, errMsg, okButtonCallback);
        }
    }

    _this.sendRequest("getNumAttendeeForApptMeeting", _this.displayEndApptMeetingConfirmationWindow, {
        appointment_uid: appt.uid
    });

}

BBB_Handler.prototype.handleEndApptMeetingResponse = function(response) {
    var result = response._data.BigBlueButtonResponse; // simplify typing
    if (result.result === "SUCCESSED") {
        if (this.endApptMeetingRspDlg) {
            this.endApptMeetingRspDlg.popup();
            return;
        }

        this._endApptMeetingDlgView = new DwtComposite(this.getShell());
        this._endApptMeetingDlgView.setSize("600", "500");
        this._endApptMeetingDlgView.getHtmlElement().style.overflow = "auto";
        this._endApptMeetingDlgView.getHtmlElement().innerHTML = "<p>End meeting successed.</p>";
        this.endApptMeetingRspDlg = new ZmDialog({
            parent: this.getShell(),
            title: this.getMessage("BigBlueButton_endMeetingForAppt"),
            view: this._endApptMeetingDlgView,
            standardButtons: [DwtDialog.OK_BUTTON]
        });
        this.endApptMeetingRspDlg.setButtonListener(DwtDialog.OK_BUTTON, new AjxListener(this, function() {
            this.endApptMeetingRspDlg.popdown();
        }));
        this.endApptMeetingRspDlg.popup();
    } else {
        var title = this.getMessage("BigBlueButton_endMeetingForApptFailed");
        var errMsg = "<p>Failed to end the meeting since the following error message:<br/>"
                     + result.error_message + "</p>";
        var okButtonCallback = function () {
            this._endMeetingForAppt(this);
        }
        this.displayErrorDlg(title, errMsg, okButtonCallback);
    }
}

BBB_Handler.prototype._saveAppt = function(apptController) {
    if (apptController._sendListener) {
        apptController._sendListener();
    } else if(apptController._saveListener) {
        apptController._saveListener();
    }
};

BBB_Handler.prototype._insertMeetingDetails = function(_this, saveMeeting, callback) {
    var input = {};
    var composeView = appCtxt.getCurrentView();
    var appt = composeView.getAppt();
    input["bigbluebutton_meetingName"] = appt.name;
    input["appointment_uid"] = appt.uid;
    input["appointment_organizer"] = appt.organizer ? appt.organizer : _this.email;

    BBB_Handler.prototype.handleCreateApptMeetingResponse = function(response) {
        var result = response._data.BigBlueButtonResponse; // simplify typing
        if (result.result === "SUCCESSED") {
            var currentContent = composeView.getHtmlEditor().getContent();
            
            if (currentContent.indexOf("BigBlueButton meeting has been created for this appointment.") != -1) {
                var newContent = currentContent;
            } else {
                if (composeView.getComposeMode() === "text/html") {
                    var BBBDetailStr = _this._getBBBDetailString("html", appt.uid);
                    var index = currentContent.lastIndexOf("</body></html>");
                    var oldContent = currentContent.substr(0, index);
                    var newContent = [oldContent, BBBDetailStr, "</body></html>"].join("");
                } else {
                    var BBBDetailStr = _this._getBBBDetailString("text", appt.uid);
                    if (currentContent === "") {
                        var newContent = BBBDetailStr;
                    } else {
                        var newContent = [currentContent, BBBDetailStr].join("\n");
                    }
                }
            }

            composeView.getHtmlEditor().setContent(newContent);
            if (saveMeeting) {
                setTimeout(AjxCallback.simpleClosure(_this._saveAppt, this, this), 500);
            }
            if (typeof callback === "function") {
                callback();
            }
        } else { // failure cases
            var title = _this.getMessage("BigBlueButton_createApptMeetingFailed");
            var errMsg = "<p>Failed to create the meeting since the following error message:<br/>"
                + result.error_message + "</p>";
            var okButtonCallback = function () {
                _this.sendRequest("createApptMeeting", _this.handleCreateApptMeetingResponse.bind(this), input);
            }
            _this.displayErrorDlg(title, errMsg, okButtonCallback);
        }
    }

    _this.sendRequest("createApptMeeting", _this.handleCreateApptMeetingResponse.bind(this), input);
}

BBB_Handler.prototype._getBBBDetailString = function(type, appointmentID) {
    var instructions = this.getMessage("BigBlueButton_insertApptInstruction");
    var input = {
        request: "joinApptMeeting",
        appointmentID: appointmentID
    }
    var url = this._getURL(input);

    if (type === 'html') {
        instructions = AjxMessageFormat.format(instructions, "<a href=\"" + url + "\" target=\"_blank\">" + url + "</a>");

        return ["<p>", instructions, "<br></p>"].join("");
    } else {
        instructions = AjxMessageFormat.format(instructions, url);
        return instructions.split("<br>").join("\n") + "\n";
    }
}