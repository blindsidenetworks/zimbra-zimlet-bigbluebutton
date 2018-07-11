# zimbra-zimlet-bigbluebutton

BigBlueButton is an open-source conference system that is mainly used for online teaching. More information about BigBlueButton can be found [here](https://bigbluebutton.org/ "BigBlueButton").  
This zimlet provides you an easy way to start new meeting using BigBlueButton, join BigBlueButton meeting, create BigBlueButton meeting for an appointment. This will make conference easier for every user.

## Installation
```
git clone -b yellowstar https://github.com/yunkaiwang/zimbra-zimlet-bigbluebutton.git
cd zimbra-zimlet-bigbluebutton 
./install.sh  
```
## Uninstallation
```
cd /path/to/folder/zimbra-zimlet-bigbluebutton
./install.sh -u
```
## Example

Create meeting dialog:  
![ScreenShot](/screenshot/start_meeting_dialog.png?raw=true "Start Meeting")  

Join meeting dialog when meeting is alive:  
![ScreenShot](/screenshot/join_meeting_dialog.png?raw=true "Join Active Meeting")  

Join meeting dialog when meeting is dead:  
![ScreenShot](/screenshot/join_meeting_dialog_meeting_ended.png?raw=true "Join Ended Meeting")  

End meeting dialog:  
![ScreenShot](/screenshot/end_meeting_dialog.png?raw=true "End Meeting")

Before create meeting for an appointment:  
![ScreenShot](/screenshot/appointment_before.png?raw=true "Appointment")  

After create meeting for an appointment:  
![ScreenShot](/screenshot/appointment.png?raw=true "Appointment")  
