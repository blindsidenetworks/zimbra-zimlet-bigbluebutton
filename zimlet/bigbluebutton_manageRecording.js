BBB_Handler.MANAGE_RECORDING_PROPS = [BBB_Handler.UPDATE_RECORD];

BBB_Handler.prototype._displayManageRecordingDialog = function() {
    this.sendRequest("getRecordingsCreatedByUser", this._displayManageRecordingDialogWithRecordings, {});
}

BBB_Handler.prototype._displayManageRecordingDialogWithRecordings = function(response) {
    var result = response._data.BigBlueButtonResponse; // simplify typing
    if (result.result === "SUCCESSED") {
        var tableID = 'manageRecordingSelectIDTable';
        var recordings = result.getRecordingsCreatedByUserResult.recordings;
        if (this.recordingDlg) {
            this.clearSelectRecordIDTable(tableID);
            document.getElementById(tableID + "_BBB_noRecordingWarning").style.display = "none";
            document.getElementById(tableID + "_parent").style.display = "block";
            document.getElementById(tableID + "_input").style.display = "block";
            this._fillSelectRecordIDTable(tableID, recordings);
            this.recordingDlg.setButtonListener(DwtDialog.OK_BUTTON, new AjxListener(this, this.updateRecording, [tableID, recordings]));
            this.recordingDlg.popup();
            return;
        }

        this._recordingDlgView = new DwtComposite(this.getShell());
        this._recordingDlgView.setSize("600", "500");
        this._recordingDlgView.getHtmlElement().style.overflow = "auto";
        this._recordingDlgView.getHtmlElement().innerHTML = "<p id='" + tableID + "_BBB_noRecordingWarning' " +
            "style='display:none'>No recording available.</p><div style='height:150px; overflow-y:scroll; display:block;' id='" +
            tableID + "_parent'><table id='" + tableID +"'>" +
            "<tr><td></td><td style='padding:0 20px 0 0;'>Meeting name:</td><td>Created on:</td></tr></table></div><div id='" +
            tableID + "_input'>" + this._createInputTable(BBB_Handler.MANAGE_RECORDING_PROPS) + "</div>";

        this._fillSelectRecordIDTable(tableID, recordings);

        this.recordingDlg = new ZmDialog({
            parent: this.getShell(),
            title: this.getMessage("BigBlueButton_manageRecording"),
            view: this._recordingDlgView,
            standardButtons: [DwtDialog.OK_BUTTON, DwtDialog.CANCEL_BUTTON]
        });
        this.recordingDlg.setButtonListener(DwtDialog.OK_BUTTON, new AjxListener(this, this.updateRecording, [tableID, recordings]));
        this.recordingDlg.popup();
    } else {
        var title = this.getMessage("BigBlueButton_getRecordingIDsFailed");
        var errMsg = "<p>Failed to get the recordIDs since the following error message:<br/>" + result.error_message +
                     "<br/><br/>Click 'OK' to try again.</p>";
        var callback = function () {
            this._displayManageRecordingDialog();
        }
        this.displayErrorDlg(title, errMsg, callback);
    }
}

BBB_Handler.prototype.clearSelectRecordIDTable = function(tableID) {
    var table = document.getElementById(tableID);
    table.innerHTML = "<tr><td></td><td style='padding:0 20px 0 0;'>Meeting name:</td><td>Created on:</td></tr>";
}

BBB_Handler.prototype._fillSelectRecordIDTable = function(tableID, recordings) {
    if (recordings === "" || recordings == null) {
        document.getElementById(tableID + "_BBB_noRecordingWarning").style.display = "inline";
        document.getElementById(tableID + "_parent").style.display = "none";
        if (document.getElementById(tableID + "_input")) {
            document.getElementById(tableID + "_input").style.display = "none";
        }
        return;
    }
    var recordingsArr = recordings.split(",");
    recordingsArr.sort(function(a, b) {
        return Number(b.substring(b.indexOf("@") + 1)) - Number(a.substring(a.indexOf("@") + 1));
    });
    
    var table = document.getElementById(tableID);
    document.getElementById(tableID + "_parent").style.height = recordingsArr.length > 4 ? "180px" :
        (recordingsArr.length * 40 + 40) + "px";
    for (var i = 0; i < recordingsArr.length; ++i) {
        var recording = recordingsArr[i];
        var meetingName = recording.substring(0, recording.indexOf(":"));
        var recordID = recording.substring(recording.indexOf(":") + 1, recording.indexOf("@"));
        var createTime = recording.substring(recording.indexOf("@") + 1);

        var row = table.insertRow();
        row.id = tableID + "_" + i;
        var cell1 = row.insertCell(0);
        var cell2 = row.insertCell(1);
        var cell3 = row.insertCell(2);
        var cell4 = row.insertCell(3);

        cell1.innerHTML = "<input name='BBB_selectRecordingIDInput', id='" + tableID + "_BBB_selectRecordingIDInput_" +
            recordID + "' " + "value='" + recordID + "' type='radio' />";
        cell2.innerHTML = "<p>" + meetingName + "</p>";
        cell3.innerHTML = "<p>" + new Date(Number(createTime)).toString() + "</p>";
        cell4.innerHTML = "<div id='" + tableID + "_BBB_selectRecordingIDInput_" + recordID + "_btn'>"

        var btn = new DwtButton({parent:this.getShell()});
        btn.setText(this.getMessage("BigBlueButton_selectRecordIDViewDetail"));
        btn.addSelectionListener(new AjxListener(this, this._handleViewRecordDetail, [recordID]));
        document.getElementById(tableID + "_BBB_selectRecordingIDInput_" + recordID + "_btn").appendChild(btn.getHtmlElement());
    }
}

BBB_Handler.prototype._handleViewRecordDetail = function(recordID) {
    BBB_Handler.prototype._displayRecordingDetail = function(response) {
        var result = response._data.BigBlueButtonResponse; // simplify typing
        if (result.result === "SUCCESSED") {
            if (this.recordingDetailDlg) {
                this.setRecordingDetailView(result.getRecordingDetailResult);
                this.recordingDetailDlg.popup();
                return;
            }

            this._recordingDetailDlgView = new DwtComposite(this.getShell());
            this._recordingDetailDlgView.setSize("600", "500");
            this._recordingDetailDlgView.getHtmlElement().style.overflow = "auto";
            this._recordingDetailDlgView.getHtmlElement().innerHTML = "<div id='recordingDetailView' />";
            this.setRecordingDetailView(result.getRecordingDetailResult);

            this.recordingDetailDlg = new ZmDialog({
                parent: this.getShell(),
                title: this.getMessage("BigBlueButton_viewRecordDetail"),
                view: this._recordingDetailDlgView,
                standardButtons: [DwtDialog.OK_BUTTON]
            });
            this.recordingDetailDlg.setButtonListener(DwtDialog.OK_BUTTON, new AjxListener(this, function() {
                this.recordingDetailDlg.popdown();
            }));
            this.recordingDetailDlg.popup();
        } else {
            var title = this.getMessage("BigBlueButton_getRecordingDetailFailed");
            var errMsg = "<p>Failed to get the recording detail since the following error message:<br/>" + result.error_message +
                         "<br/><br/>Click 'OK' to try again.</p>";
            var callback = function () {
                this._handleViewRecordDetail(recordID);
            }
            this.displayErrorDlg(title, errMsg, callback);
        }
    }
    this.sendRequest("getRecordingDetail", this._displayRecordingDetail, {
        bigbluebutton_recordID: recordID
    });
}

BBB_Handler.prototype.updateRecording = function(tableID, recordings) {
    this.recordingDlg.popdown();
    var selectedRecordID = this.findSelectedRecordID(tableID, recordings);
    if (selectedRecordID == null) {
        if (recordings === "") {
            return;
        }
        var title = this.getMessage("BigBlueButton_getRecordingNoIdSelected");
        var errMsg = "<p>Failed to update recording since:<br/>No recording was selected.<br/>" +
                     "<br/>Click 'OK' to try again.</p>";
        var callback = function () {
            this.recordingDlg.popup();
        }
        this.displayErrorDlg(title, errMsg, callback);
        return;
    }
    // user choose to update meeting, we need to get extra information from user
    if (document.getElementById(BBB_Handler.UPDATE_RECORD.propId + "_update").checked) {
        this._updateRecordingClicked(recordings);
    } else {
        var input = this._getInput(BBB_Handler.MANAGE_RECORDING_PROPS);
        input.bigbluebutton_recordID = selectedRecordID;
        if (document.getElementById(BBB_Handler.UPDATE_RECORD.propId + "_delete").checked) {
            this.displayConfirmationDialog(this.getMessage("BigBlueButton_deleteRecordingConfirmTitle"),
                "Are you sure you want to delete the recording?", function() {
                this.sendRequest("updateRecording", this.handleUpdateRecordingResponse, input);
            }, function() {
                this.recordingDlg.popup();
            });
        } else {
            this.sendRequest("updateRecording", this.handleUpdateRecordingResponse, input);
        }
    }
}

BBB_Handler.prototype.findSelectedRecordID = function(tableID, recordings) {
    if (recordings === "" || recordings == null) {
        return null;
    }
    var recordingsArr = recordings.split(",");
    for (var i = 0; i < recordingsArr.length; ++i) {
        var recording = recordingsArr[i];
        var recordID = recording.substring(recording.indexOf(":") + 1, recording.indexOf("@"));
        if (document.getElementById(tableID + "_BBB_selectRecordingIDInput_" + recordID).checked) {
            return recordID;
        }
    }
}

BBB_Handler.prototype.setRecordingDetailView = function(detail) {
    var html = [];
    html.push("<table>");
    html.push("<tr><td>Meeting id</td><td>" + detail.meetingID + "</td></tr>");
    html.push("<tr><td style='padding:0 20px 0 0;'>Meeting name</td>",
        "<td>" + detail.name + "</td></tr>");
    html.push("<tr><td>Participants</td><td>" + detail.participants + "</td></tr>");
    html.push("<tr><td>Start time</td><td>" + (detail.startTime ? new Date(Number(detail.startTime)).toString() : "N/A") + "</td></tr>");
    html.push("<tr><td>End time</td><td>" + (detail.endTime ? new Date(Number(detail.endTime)).toString() : "N/A") + "</td></tr>");
    html.push("<tr><td>Published</td><td>" + detail.published + "</td></tr>");
    html.push("</table>");
    html.push("<p>Click <a href='", detail.playbackURL, "' target='_blank'>here</a>",
        " to view the recording.</p>")
    document.getElementById("recordingDetailView").innerHTML = html.join("");
}

BBB_Handler.prototype.handleUpdateRecordingResponse = function(response) {
    var result = response._data.BigBlueButtonResponse; // simplify typing
    if (result.result === "SUCCESSED") {
        if (this.manageRecordingDlg) {
            this.manageRecordingDlg.popup();
            return;
        }    
        this._manageRecordingDlgView = new DwtComposite(this.getShell());
        this._manageRecordingDlgView.setSize("600", "500");
        this._manageRecordingDlgView.getHtmlElement().style.overflow = "auto";
        this._manageRecordingDlgView.getHtmlElement().innerHTML = "<p>Update recording successed.</p>";
        
        this.manageRecordingDlg = new ZmDialog({
            parent: this.getShell(),
            title: this.getMessage("BigBlueButton_manageRecordingSuccessed"),
            view: this._manageRecordingDlgView,
            standardButtons: [DwtDialog.OK_BUTTON]
        });
        this.manageRecordingDlg.setButtonListener(DwtDialog.OK_BUTTON, new AjxListener(this, function() {
            this.manageRecordingDlg.popdown();
        }));
        this.manageRecordingDlg.popup();
    } else {
        var title = this.getMessage("BigBlueButton_manageRecordingFailed");
        var errMsg = "<p>Failed to update the recording since the following error message:<br/>" + result.error_message +
                     "<br/><br/>Click 'OK' to try again.</p>";
        var callback = function () {
            this.recordingDlg.popup();
        }
        this.displayErrorDlg(title, errMsg, callback);
    }
}

BBB_Handler.prototype._updateRecordingClicked = function(recordings) {
    if (!this.updateRecordingInputDlg) {
        this._updateRecordingInputDlgView = new DwtComposite(this.getShell());
        this._updateRecordingInputDlgView.setSize("600", "500");
        this._updateRecordingInputDlgView.getHtmlElement().style.overflow = "auto";
        this._updateRecordingInputDlgView.getHtmlElement().innerHTML = this._createUpdateRecordingInputTable();

        var btn = new DwtButton({parent:this.getShell()});
        btn.setText(this.getMessage("BigBlueButton_addUpdateRecordingInput"));
        btn.addSelectionListener(new AjxListener(this, this._handlerAddInput));
        document.getElementById("BBB_updateRecordingInputTable_addRow").appendChild(btn.getHtmlElement());

        this.updateRecordingInputDlg = new ZmDialog({
            parent: this.getShell(),
            title: this.getMessage("BigBlueButton_updateRecordingInput"),
            view: this._updateRecordingInputDlgView,
            standardButtons: [DwtDialog.OK_BUTTON, DwtDialog.CANCEL_BUTTON]
        });
        this.updateRecordingInputDlg.setButtonListener(DwtDialog.OK_BUTTON, new AjxListener(this, function() {
            this.updateRecordingInputDlg.popdown();
            var input = this._getInput(BBB_Handler.MANAGE_RECORDING_PROPS);

            var table = document.getElementById("BBB_updateRecordingInputTable");
            var userInput = {}
            for (var i = 0; i < this.BBB_updateRecordingInput_count; ++i) {
                var index = "BBB_updateRecordingInput_" + i;
                if (document.getElementById(index)) {
                    var key = document.getElementById(index + "_key");
                    var value = document.getElementById(index + "_value");
                    if (key.value != "" && value.value != "") {
                        userInput[key.value] = value.value;
                    }
                }
            }
            input["bigbluebutton_userInput"] = JSON.stringify(userInput);
            input.bigbluebutton_recordID = this.findSelectedRecordID('manageRecordingSelectIDTable', recordings);
            this.sendRequest("updateRecording", this.handleUpdateRecordingResponse, input);
        }));
    } else {
        this.clearUpdateRecordingInputTable();
    }
    
    this.BBB_updateRecordingInput_count = 0;
    this.updateRecordingInputDlg.popup();
}

BBB_Handler.prototype._createUpdateRecordingInputTable = function() {
    var html = [];

    html.push("<p>Please enter the information that you want to update on the recording:</p>");
    html.push("<div id='BBB_updateRecordingInputTable_parent' style='height:150px; overflow-y:scroll; display:none;'>");
    html.push("<table id='BBB_updateRecordingInputTable' style='border: 1px solid black'>");
    html.push("<tr><td style='width:50px'>Key</td><td style='width:50px'>Value</td>");

    html.push("</table></div>");
    html.push("<div id='BBB_updateRecordingInputTable_addRow' />");
    return html.join("");
}

BBB_Handler.prototype._handlerAddInput = function() {
    document.getElementById("BBB_updateRecordingInputTable_parent").style.display = "block";
    var currentRowIndex = this.BBB_updateRecordingInput_count;
    ++this.BBB_updateRecordingInput_count;
    var table = document.getElementById("BBB_updateRecordingInputTable");
    var row = table.insertRow();
    row.id = "BBB_updateRecordingInput_" + currentRowIndex;
    var cell1 = row.insertCell(0);
    var cell2 = row.insertCell(1);
    var cell3 = row.insertCell(2);
    cell1.innerHTML = "<input id='BBB_updateRecordingInput_" + currentRowIndex + "_key'" + "type='text' />";
    cell2.innerHTML = "<input id='BBB_updateRecordingInput_" + currentRowIndex + "_value'" + "type='text' />";
    cell3.innerHTML = "<button id='BBB_updateRecordingInput_" + currentRowIndex + "_button'>Delete row</button>";

    document.getElementById("BBB_updateRecordingInput_" + currentRowIndex + "_button").onclick = function() {
        table.deleteRow(document.getElementById("BBB_updateRecordingInput_" + currentRowIndex).rowIndex);
    }
}

BBB_Handler.prototype.clearUpdateRecordingInputTable = function() {
    var table = document.getElementById("BBB_updateRecordingInputTable");
    for (var i = 0; i < this.BBB_updateRecordingInput_count; ++i) {
        if (document.getElementById("BBB_updateRecordingInput_" + i)) {
            table.deleteRow(document.getElementById("BBB_updateRecordingInput_" + i).rowIndex);
        }
    }
    document.getElementById("BBB_updateRecordingInputTable_parent").style.display = "none";
}