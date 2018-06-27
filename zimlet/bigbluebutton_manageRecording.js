BBB_Handler.MANAGE_RECORDING_PROPS = [BBB_Handler.UPDATE_RECORD];

BBB_Handler.prototype.updateRecording = function(recordID) {
    var input = this._getInput(BBB_Handler.MANAGE_RECORDING_PROPS);
    input.bigbluebutton_recordID = recordID;
    if (document.getElementById(BBB_Handler.UPDATE_RECORD.propId + "_update").checked) {
        this._updateRecordingClicked(recordID)
    } else if (document.getElementById(BBB_Handler.UPDATE_RECORD.propId + "_delete").checked) {
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

BBB_Handler.prototype._updateRecordingClicked = function(recordID) {
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
            input.bigbluebutton_recordID = recordID;
            this.sendRequest("updateRecording", this.handleUpdateRecordingResponse, input);
        }));
    } else {
        this.clearUpdateRecordingInputTable();
    }
    
    this.BBB_updateRecordingInput_count = 0;
    this.updateRecordingInputDlg.popup();
}

BBB_Handler.prototype._handlerAddInput = function() {
    document.getElementById("BBB_updateRecordingInputTable_parent").style.display = "block";
    var currentRowIndex = this.BBB_updateRecordingInput_count++;
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