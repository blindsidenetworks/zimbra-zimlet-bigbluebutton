package Blindside;

import BigBlueButton.impl.BaseBBBAPI;
import BigBlueButton.api.BBBException;
import BigBlueButton.api.BBBMeeting;

import java.io.InputStream;
import java.io.UnsupportedEncodingException;
import java.net.InetAddress;
import java.net.URL;
import java.net.UnknownHostException;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.Iterator;
import java.util.Map;
import java.util.Random;

import org.apache.commons.io.IOUtils;
import org.json.JSONException;
import org.json.JSONObject;

import com.zimbra.soap.DocumentHandler;

public class BigBlueButtonWrapper {
    private BaseBBBAPI api;
    public static final String RECORDING_READY_URL; 
    private static final String MEETING_END_URL;
    static {   
        String hostAddr = null;    
        try {  
            hostAddr = InetAddress.getLocalHost().getHostAddress();    
        } catch (UnknownHostException e) { 
            hostAddr = "localhost";    
        }  
        RECORDING_READY_URL = "https://" + hostAddr 
                + "/service/extension/BigBlueButtonExt/BigBlueButton?request=recordingReady"; 
        MEETING_END_URL = "https://3185dd14.ngrok.io"
                + "/service/extension/BigBlueButtonExt/BigBlueButton?request=meetingEnded";
    }
    
    public BigBlueButtonWrapper(String url, String securitySalt) {
        api = new BaseBBBAPI(url, securitySalt);
    }
    
    /*
     * find the meeting with the given meeting ID, BBBException is thrown when meeting
     * is not found
     */
    private BBBMeeting findMeeting(String meetingID) throws BBBException {
        return BigBlueButtonDBWrapper.findMeeting(meetingID);
    }

    /*
     * find the meetingID that relates to the given appointment
     */
    public String findApptMeetingID(String uid) throws BBBException {
        return BigBlueButtonDBWrapper.findApptMeetingID(uid);
    }
    
    /*
     * add the meeting to existing meeting list if it doesn't exist
     */
    private BBBMeeting addMeeting(BBBMeeting meeting, String creatorEmail) throws BBBException {
        try {
            String meetingID = meeting.getMeetingID();
            findMeeting(meetingID); /* if the meeting doesn't exist, this statement will throw an exception */
            throw new BBBException(BBBException.MESSAGEKEY_GENERALERROR, "Meeting " + meetingID + " already exists!");
        } catch (BBBException e) { /* meeting doesn't exist, add the meeting to the database */
            if (!e.getMessageKey().equalsIgnoreCase(BBBException.MESSAGEKEY_NOTFOUND))
                throw e;
            BigBlueButtonDBWrapper.addMeeting(meeting, creatorEmail);
            return meeting;
        }
    }
    
    /*
     * Make sure that the meeting with the given meeting ID is already running
     */
    private void makeSureMeetingIsRunning(String meetingID) throws BBBException {
        BBBMeeting meeting = findMeeting(meetingID);
        try {
            meeting = api.createMeeting(meeting);
            BigBlueButtonDBWrapper.updateMeeting(meeting);
        } catch (BBBException e) { } /* Meeting is already running */
    }
    
    /*
     * Make sure the meeting for the appointment already exist
     */
    public void createApptMeeting(String meetingName, String organizer, String uid) throws BBBException {
        try {
            findApptMeetingID(uid);
        } catch (BBBException e) {
            if (!e.getMessageKey().equalsIgnoreCase(BBBException.MESSAGEKEY_NOTFOUND))
                throw e;
            createMeeting(meetingName, organizer, false, uid);
        }
    }
    
    /*
     * Find the creator to the given meeting
     */
    public String findCreator(String meetingID) throws BBBException {
        return BigBlueButtonDBWrapper.findCreator(meetingID);
    }

    /*
     * Get the url to join the meeting with the given display name and moderator password
     */
    public String getJoinMeetingURL(String meetingID, String displayName, String email) throws BBBException {
        if (meetingHasEnded(meetingID))
            throw new BBBException(BBBException.MESSAGEKEY_GENERALERROR, "Meeting " + meetingID + " has already ended!");
        
        makeSureMeetingIsRunning(meetingID);
        BBBMeeting meeting = findMeeting(meetingID);
        BigBlueButtonDBWrapper.addAttendee(meetingID, displayName, email);
//        return api.getJoinMeetingURL(meetingID, meeting.getModeratorPW(), displayName, null, true);
        return api.getJoinMeetingURL(meetingID, meeting.getModeratorPW(), displayName, null, false);
    }

    /*
     * Create meeting in database
     */
    public BBBMeeting createMeeting(String meetingName, String creator, boolean recording)
            throws BBBException { 
        return createMeeting(meetingName, creator, recording, null);
    }
    
    public static final String getEndMeetingCallbackURL(String meetingID, String securitySalt) {
        return MEETING_END_URL + "&bigbluebutton_meetingID=" + meetingID +
                "&bigbluebutton_securitySalt=" + securitySalt;
    }
    
    private BBBMeeting createMeeting(String meetingName, String creator, boolean recording, String uid)
            throws BBBException {
        Random rand = new Random();
        do {
            try {
                String meetingID = null;
                try {
                    meetingID = BigBlueButtonSoapHandler.encode(
                            DocumentHandler.getLocalHost() + Long.toString(Math.abs(rand.nextLong())));
                } catch (UnsupportedEncodingException e) {
                    meetingID = DocumentHandler.getLocalHost() + Long.toString(Math.abs(rand.nextLong()));
                }
                BBBMeeting meeting = new BBBMeeting(meetingID);
                meeting.setName(meetingName);
                meeting.setRecord(true);
                meeting.setAutoStartRecording(recording);
                meeting.setAllowStartStopRecording(true);
                meeting = addMeeting(meeting, creator);
                if (uid != null) {
                    BigBlueButtonDBWrapper.addApptMeeting(uid, meetingID);
                }
                return meeting;
            } catch (BBBException e) { // very unlikely to happen, but there may be two meetings
                                       // with the same meeting id, so we need to retry until success
                if (e.getMessage().endsWith("already exists!"))
                    continue;
                else
                    throw e;
            }
        } while (true);
    }

    @SuppressWarnings("unchecked")
    public String getPlaybackURL(String recordingID, String meetingID, String type) throws BBBException {
        Map<String, Object> result = api.getRecordings(meetingID, recordingID);

        if (result.containsKey("messageKey") && "noRecordings".equalsIgnoreCase((String) result.get("messageKey"))) {
            throw new BBBException(BBBException.MESSAGEKEY_NOTFOUND, "Recording " + recordingID + " doesnot exist!");
        }
        
        ArrayList<Object> recordings = (ArrayList<Object>) result.get("recordings");
        HashMap<String, Object> recording = (HashMap<String, Object>) recordings.get(0);
        ArrayList<Object> playbackList = (ArrayList<Object>) recording.get("playback");
        for (Object playback : playbackList) {
            HashMap<String, Object> playbackMap = (HashMap<String, Object>) playback;
            if (((String) playbackMap.get("type")).equalsIgnoreCase(type)) {
                return (String) playbackMap.get("url");
            }
        }
        
        return null;
    }

    public String getJoinApptMeetingURL(String meetingName, String displayName, String organizer,
            String uid, String email) throws BBBException {
        String meetingID = findApptMeetingID(uid);
        return getJoinMeetingURL(meetingID, displayName, email);
    }
    
    /*
     * End the meeting with the given meetingID, return true is the meeting is successfully ended or
     * the meeting doesn't exist, return false otherwise (i.e., the provided email is not the creator's email)
     */
    public boolean endMeeting(String meetingID, String email) throws BBBException {
        BBBMeeting meeting = null;
        try {
            meeting = findMeeting(meetingID);
        } catch (BBBException e) { /* meeting doesn't exist */
            return true;
        }
        if (meetingHasEnded(meetingID)) {
            throw new BBBException(BBBException.MESSAGEKEY_GENERALERROR,
                    "Meeting " + meetingID + " has already ended!");
        }
        
        if (!BigBlueButtonDBWrapper.authenticateAction(meetingID, email)) {
            throw new BBBException(BBBException.MESSAGEKEY_UNREACHABLE, "Only the creator can end the meeting!");
        }
        boolean result = api.endMeeting(meeting);
        if (result == true) { /* end the meeting in the database */
            BigBlueButtonDBWrapper.endMeeting(meetingID);
        }

        sendMeetingSummaryEmail(meetingID, email);
        return result;
    }

    private void sendMeetingSummaryEmail(String meetingID, String email) throws BBBException {
        if (!BigBlueButtonDBWrapper.authenticateAction(meetingID, email)) {
            throw new BBBException(BBBException.MESSAGEKEY_UNREACHABLE, "Only the creator can view the meeting summary!");
        }
        try {
            BigBlueButtonHelper.sendMeetingSummaryEmail(email, this.getMeetingInfo(meetingID));
        } catch (Exception e) {
            throw new BBBException(BBBException.MESSAGEKEY_GENERALERROR,
                    "Failed to send summary email since: " + e.getMessage());
        }
    }
    
    public boolean endApptMeeting(String uid, String creator) throws BBBException {
        String meetingID = null;
        meetingID = findApptMeetingID(uid);
        return endMeeting(meetingID, creator);
    }
    
    public ArrayList<Map<String, Object>> getMeetingStat(String meetingID) throws BBBException {
        try {
            String statisticURL = this.getPlaybackURL(null, meetingID, "statistics");
            ArrayList<Map<String, Object>> userInfo = null;
            
            if (statisticURL != null) {
                InputStream input = new URL(statisticURL + "data.csv").openStream();
                String csv = IOUtils.toString(input, "UTF-8");
                
                userInfo = new ArrayList<Map<String, Object>>();
                String[] list = csv.split("\n");
                String[] label = list[0].split(",");
                for (int i = 1; i < list.length; ++i) {
                    Map<String, Object> userStat = new HashMap<String, Object>();
                    String[] vals = list[i].split(",");
                    for (int j = 0; j < vals.length; ++j) {
                        userStat.put(label[j], vals[j]);
                    }
                    userInfo.add(userStat);
                }
            }
            return userInfo;
        } catch (Exception e) { 
            throw new BBBException(BBBException.MESSAGEKEY_GENERALERROR, e.getMessage());
        }
    }
    
    @SuppressWarnings("unchecked")
    private Map<String, Object> getMeetingInfo(String meetingID) throws BBBException {
        BBBMeeting meeting = null;
        try {
            meeting = findMeeting(meetingID);
        } catch (BBBException e) { /* meeting doesn't exist */
            throw e;
        } 
        
        // we can get more information from BBB server if the meeting is still running
        if (api.isMeetingRunning(meetingID)) {
            Map<String, Object> info = null;
            info = api.getMeetingInfo(meeting);
            Map<String, Object> infoFromDatabase = BigBlueButtonDBWrapper.getMeetingInfo(meetingID);
            
            info.replace("createTime", infoFromDatabase.get("createTime"));
            if (infoFromDatabase.containsKey("endTime")) {
                info.put("endTime", infoFromDatabase.get("endTime"));
            }
            ArrayList<Object> attendees = (ArrayList<Object>) info.get("attendees");
            ArrayList<Map<String, String>> attendeesInfoFromDatabase =
                    (ArrayList<Map<String, String>>) infoFromDatabase.get("attendees");
            for (Object attendee : attendees) {
                Map<String, Object> attendeeInfo = (Map<String, Object>) attendee;
                String fullName = (String) attendeeInfo.get("fullName");
                for (Map<String, String> attendeeInfoFromDatabase : attendeesInfoFromDatabase) {
                    if (attendeeInfoFromDatabase.get("fullName").equalsIgnoreCase(fullName)) {
                        attendeeInfo.put("email", attendeeInfoFromDatabase.get("email"));
                    }
                }
            }
            
            return info;
        }
        
        return BigBlueButtonDBWrapper.getMeetingInfo(meetingID);
    }
    
    public String getJoinApptMeetingURL(String appointmentID, String displayName, String email, String password)
            throws BBBException {
        String meetingID = findApptMeetingID(appointmentID);
        if (!BigBlueButtonDBWrapper.authenticateJoinApptMeeting(meetingID, password)) {
            throw new BBBException(BBBException.MESSAGEKEY_UNREACHABLE, "Wrong password provided!");
        }
        return getJoinMeetingURL(meetingID, displayName, email);
    }
    
    public void updateRecording(String recordingID, String type, JSONObject userInput)
            throws BBBException, JSONException {
        boolean result = true;
        switch (type) {
        case "publish":
            result = api.publishRecordings(recordingID, true);
            break;
        case "unpublish":
            result = api.publishRecordings(recordingID, false);
            break;
        case "delete":
            result = api.deteteRecordings(recordingID);
            break;
        case "update":
            Map<String, String> input = new HashMap<String, String>();
            @SuppressWarnings("unchecked") Iterator<String> keys = userInput.keys();
            while (keys.hasNext()) {
                String key = keys.next();
                input.put(key, userInput.getString(key));
            }
            result = api.updateRecordings(recordingID, input);
            break;
        default:
            throw new BBBException(BBBException.MESSAGEKEY_GENERALERROR,
                    "BigBlueButton cannot perform '" + type + "' action on recording.");
        }
        if (!result) {
            throw new BBBException(BBBException.MESSAGEKEY_GENERALERROR,
                    "BigBlueButton failed to perform '" + type + "' action on recording.");
        }
    }

    public void sendRecordingReadyEmail(String meetingID, String recordingID) throws BBBException {
        String creatorEmail = findCreator(meetingID);
        try {
            String hostAddr = InetAddress.getLocalHost().getHostAddress();
            BigBlueButtonHelper.sendRecordReadyEmail(hostAddr, creatorEmail,
                    meetingID, recordingID, getMeetingStat(meetingID));
        } catch (Exception e) {
            throw new BBBException(BBBException.MESSAGEKEY_GENERALERROR, 
                    "Failed to send record ready email since " + e.getMessage());
        }
    }
    
    @SuppressWarnings("unchecked")
    public String getRecordingIDs(String meetingIDs) throws BBBException {
        Map<String, Object> result = api.getRecordings(meetingIDs);
        
        if (result.containsKey("messageKey") && "noRecordings".equalsIgnoreCase((String) result.get("messageKey"))) {
            return "";
        }
        
        String recordingIDs = "";
        ArrayList<Object> recordings = (ArrayList<Object>) result.get("recordings");
        for (Object recording : recordings) {
            HashMap<String, Object> recordingInfo = (HashMap<String, Object>) recording;
            recordingIDs += (String) recordingInfo.get("recordID") + ",";
        }
        
        return recordingIDs.equalsIgnoreCase("") ? recordingIDs :
            recordingIDs.substring(0, recordingIDs.length() - 1); // remove the last ','
    }

    @SuppressWarnings("unchecked")
    public Map<String, Object> getRecordInfo(String recordID) throws BBBException {
        Map<String, Object> result = api.getRecordings(null, recordID);

        if (result.containsKey("messageKey") && "noRecordings".equalsIgnoreCase((String) result.get("messageKey"))) {
            throw new BBBException(BBBException.MESSAGEKEY_NOTFOUND, "Recording doesnot exist!");
        }
        
        ArrayList<Object> recordings = (ArrayList<Object>) result.get("recordings");
        HashMap<String, Object> recording = (HashMap<String, Object>) recordings.get(0);
        ArrayList<Object> playbackList = (ArrayList<Object>) recording.get("playback");
        for (Object playback : playbackList) {
            HashMap<String, Object> playbackMap = (HashMap<String, Object>) playback;
            if (((String) playbackMap.get("type")).equalsIgnoreCase("presentation") ||
                    ((String) playbackMap.get("type")).equalsIgnoreCase("video")) {
                recording.put("playbackURL", (String) playbackMap.get("url"));
            }
        }
        
        return recording;
    }
    
    public Map<String, Object> getMeetingSummary(String meetingID, String email) throws BBBException {
        if (!BigBlueButtonDBWrapper.authenticateAction(meetingID, email)) {
            throw new BBBException(BBBException.MESSAGEKEY_UNREACHABLE,
                    "Only the creator can view the meeting summary!");
        }
        return getMeetingInfo(meetingID);
    }
    
    public boolean apptMeetingHasEnded(String appointmentID) throws BBBException {
        String meetingID = this.findApptMeetingID(appointmentID);
        return meetingHasEnded(meetingID);
    }
    
    public boolean meetingHasEnded(String meetingID) throws BBBException {
        return BigBlueButtonDBWrapper.meetingHasEnded(meetingID);
    }
    
    public int getNumLiveAttendee(String meetingID) throws BBBException {
        if (meetingHasEnded(meetingID)) {
            throw new BBBException(BBBException.MESSAGEKEY_GENERALERROR,
                    "Meeting " + meetingID + " has already ended!");
        }
        if (api.isMeetingRunning(meetingID)) {
            Map<String, Object> info = api.getMeetingInfo(findMeeting(meetingID));
            return Integer.parseInt((String) info.get("participantCount"));
        } else { // meeting is not ended but not alive in BigBlueButton server, return 0
            return 0;
        }
    }
    
    // This function is called when BigBlueButton server sends a 'meeting ended' request to
    // Zimbra server as the meeting has been ended in BigBlueButton server (either the user
    // logged out or the meeting timeout), so the Zimbra server should know that this meeting
    // has been ended so that it banned all future user from joining the meeting
    public void endMeetingInDB(String meetingID, String securitySalt) throws BBBException {
        try {
            findMeeting(meetingID);
        } catch (BBBException e) { /* meeting doesn't exist */
            throw new BBBException(BBBException.MESSAGEKEY_NOTFOUND,
                    "Meeting " + meetingID + " does not exist!");
        }

        if (BigBlueButtonDBWrapper.meetingHasEnded(meetingID)) {
            throw new BBBException(BBBException.MESSAGEKEY_GENERALERROR,
                    "Meeting " + meetingID + " has already ended!");
        }
        
        if (!BigBlueButtonDBWrapper.authenticateEndMeeting(meetingID, securitySalt)) {
            throw new BBBException(BBBException.MESSAGEKEY_UNREACHABLE, "Authentication failed.");
        }
        
        BigBlueButtonDBWrapper.endMeeting(meetingID);
        sendMeetingSummaryEmail(meetingID, findCreator(meetingID));
        
    }

    public void updateCredential(String url, String securitySalt) {
        api.setCredentials(url, securitySalt);
    }

    public JSONObject getCredential() throws JSONException {
        JSONObject obj = new JSONObject();
        obj.put("bigbluebutton_serverURL", api.getUrl());
        obj.put("bigbluebutton_securitySalt", api.getSalt());
        return null;
    }
}
