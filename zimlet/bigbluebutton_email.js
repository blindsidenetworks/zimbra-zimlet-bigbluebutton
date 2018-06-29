BBB_Handler.prototype._displayBigBlueButtonEmailBar = function(toolbar, controller) {
    if (toolbar.getButton("BIGBLUEBUTTON_EMAIL")) {
        toolbar.removeOp("BIGBLUEBUTTON_EMAIL");
    }
    var buttonIndex = toolbar.opList.indexOf("COMPOSE_OPTIONS") + 1;
    var composeView = controller._composeView;
    var currentContent = composeView.getHtmlEditor().getContent();
    if (currentContent.indexOf("BigBlueButton meeting has been created.") != -1) {
        var button = toolbar.createOp("BIGBLUEBUTTON_EMAIL", {text: this.getMessage("BigBlueButton_joinEmailMeetingButton"),
                                                              tooltip: this.getMessage("BigBlueButton_joinEmailMeetingButtonToolTip"),
                                                              index: buttonIndex});
        button.addSelectionListener(new AjxListener(controller, this._joinEmailMeeting, [this, currentContent]));
    } else {
        var button = toolbar.createOp("BIGBLUEBUTTON_EMAIL", {text: this.getMessage("BigBlueButton_insertEmailButton"),
                                                              tooltip: this.getMessage("BigBlueButton_bigBlueButtonTip"),
                                                              index: buttonIndex});
        button.addSelectionListener(new AjxListener(controller, this._insertMeetingInEmail, [this, controller, button]));
    }
    toolbar.addOp("BIGBLUEBUTTON_EMAIL", buttonIndex);
}

BBB_Handler.prototype.sendJoinEmailMeetingReq = function(_this, meetingID) {
    var input = {};
    input["bigbluebutton_meetingID"] = meetingID;

    BBB_Handler.prototype.handleJoinEmailMeetingResponse = function(response) {
        var result = response._data.BigBlueButtonResponse; // simplify typing
        if (result.result === "SUCCESSED") {
            window.open(result.getJoinMeetingURLResult.join_url, '_blank');
        } else {
            var title = this.getMessage("BigBlueButton_joinMeetingFailed");
            var errMsg = this.getJoinMeetingFailedHTML(result);
            var okButtonCallback = function () {
                this.sendJoinEmailMeetingReq(this, meetingID);
            }
            this.displayErrorDlg(title, errMsg, okButtonCallback);
        }
    }

    _this.sendRequest("getJoinMeetingURL", _this.handleJoinEmailMeetingResponse, input);
}

BBB_Handler.prototype._joinEmailMeeting = function(_this, currentContent) {
    var regex = /bigbluebutton_meetingID=[a-zA-Z0-9\.-]+/
    var match = currentContent.match(regex)

    if (!match || match.length === 0) {
        var title = this.getMessage("BigBlueButton_joinMeetingFailed");
        var errMsg = this.getJoinMeetingFailedHTML({
            error_message: "Cannot find meeting id"
        });
        var okButtonCallback = function () {
            this.sendJoinEmailMeetingReq(this, meetingID);
        }
        _this._joinEmailMeeting(_this, currentContent);
    } else {
        var meetingID = match[0].substring(match[0].indexOf("=") + 1);
        _this.sendJoinEmailMeetingReq(_this, meetingID);
    }
}

BBB_Handler.prototype._insertMeetingInEmail = function(_this, controller, button) {
    var input = {};
    var composeView = controller._composeView;
    input["bigbluebutton_meetingName"] = composeView._subjectField.value;
    var currentContent = composeView.getHtmlEditor().getContent();
    BBB_Handler.prototype.handleCreateEmailMeetingResponse = function(response) {
        var result = response._data.BigBlueButtonResponse; // simplify typing
        if (result.result === "SUCCESSED") {
            
            if (composeView.getComposeMode() === "text/html") {
                var BBBDetailStr = _this._getBBBEmailDetailString("html", result.createMeetingForEmailResult.meetingID);
                var index = currentContent.lastIndexOf("</body></html>");
                var oldContent = currentContent.substr(0, index);
                var newContent = [oldContent, BBBDetailStr, "</body></html>"].join("");
            } else {
                var BBBDetailStr = _this._getBBBEmailDetailString("text", result.createMeetingForEmailResult.meetingID);
                if (currentContent === "") {
                    var newContent = BBBDetailStr;
                } else {
                    var newContent = [currentContent, BBBDetailStr].join("\n");
                }
            }

            composeView.getHtmlEditor().setContent(newContent);
            button.setText(_this.getMessage("BigBlueButton_joinEmailMeetingButton"));
            button.setToolTipContent(_this.getMessage("BigBlueButton_joinEmailMeetingButtonToolTip"));
            button.removeSelectionListeners();
            button.addSelectionListener(new AjxListener(controller, _this._joinEmailMeeting, [_this, newContent]));
        } else { // failure cases
            var title = _this.getMessage("BigBlueButton_createMeetingForEmailFailed");
            var errMsg = "<p>Failed to create the meeting since the following error message:<br/>"
                         + result.error_message + "</p>";
            var okButtonCallback = function () {
                _this.sendRequest("createMeetingForEmail", _this.handleCreateEmailMeetingResponse.bind(this), input);
            }
            _this.displayErrorDlg(title, errMsg, okButtonCallback);
        }
    }
    _this.sendRequest("createMeetingForEmail", _this.handleCreateEmailMeetingResponse.bind(this), input);
}

BBB_Handler.prototype._getBBBEmailDetailString = function(type, meetingID) {
    var instructions = this.getMessage("BigBlueButton_insertEmailInstruction");
    var input = {
        request: "joinMeeting",
        bigbluebutton_meetingID: meetingID
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
