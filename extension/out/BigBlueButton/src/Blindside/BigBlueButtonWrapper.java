package Blindside;

import BigBlueButton.impl.BaseBBBAPI;
import BigBlueButton.api.BBBException;
import BigBlueButton.api.BBBMeeting;

import java.io.InputStream;
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
        MEETING_END_URL = "https://" + hostAddr
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
     * Authenticate update meeting action, the email must match the creator email of the meeting
     * so that the meeting can be updated
     */
    private void authenticateUpdateMeeting(String meetingID, String email) throws BBBException {
        try {
            findMeeting(meetingID);
        } catch (BBBException e) { /* meeting doesn't exist */
            throw new BBBException(BBBException.MESSAGEKEY_NOTFOUND,
                    "Meeting " + meetingID + " doesn't exist!");
        }
        
        if (!BigBlueButtonDBWrapper.authenticateAction(meetingID, email)) {
            throw new BBBException(BBBException.MESSAGEKEY_UNREACHABLE,
                    "Only the creator can u the meeting!");
        }
    }
    
    private void sendMeetingSummaryEmail(String meetingID, String email) throws BBBException {
        authenticateUpdateMeeting(meetingID, email);
        try {
            BigBlueButtonHelper.sendMeetingSummaryEmail(email, this.getMeetingInfo(meetingID));
        } catch (Exception e) {
            throw new BBBException(BBBException.MESSAGEKEY_GENERALERROR,
                    "Failed to send summary email since: " + e.getMessage());
        }
    }
    
    /*
     * Make sure that the meeting with the given meeting ID is already running
     */
    private void makeSureMeetingIsRunning(String meetingID) throws BBBException {
        BBBMeeting meeting = findMeeting(meetingID);
        if (!api.isMeetingRunning(meetingID)) { // create the meeting if not already running
            meeting = api.createMeeting(meeting);
            BigBlueButtonDBWrapper.updateMeeting(meeting);
        }
    }
    
    @SuppressWarnings("unchecked")
    private Map<String, Object> getRecordInfo(String meetingID, String recordID) throws BBBException {
        Map<String, Object> result = api.getRecordings(meetingID, recordID);
        Map<String, Object> info = new HashMap<String, Object>();
        if (result.containsKey("messageKey") && 
                "noRecordings".equalsIgnoreCase((String) result.get("messageKey"))) {
            return info;
        }
        
        ArrayList<HashMap<String, Object>> recordings =
                (ArrayList<HashMap<String, Object>>) result.get("recordings");
        for (HashMap<String, Object> recording : recordings) {
            Map<String, String> recordingInfo = new HashMap<String, String>();
            ArrayList<Object> playbackList = (ArrayList<Object>) recording.get("playback");
            recordingInfo.put("recordID", (String) recording.get("recordID"));
            for (Object playback : playbackList) {
                HashMap<String, Object> playbackMap = (HashMap<String, Object>) playback;
                if (((String) playbackMap.get("type")).equalsIgnoreCase("presentation") ||
                        ((String) playbackMap.get("type")).equalsIgnoreCase("video")) {
                    recordingInfo.put("playbackURL", (String) playbackMap.get("url")); 
                }
            }
            
            info.put((String) recording.get("meetingID"), recordingInfo);
        }
        
        return info;
    }
    
    @SuppressWarnings("unchecked")
    private Map<String, Object> getMeetingInfo(String meetingID) throws BBBException {
        BBBMeeting meeting = null;
        try {
            meeting = findMeeting(meetingID);
        } catch (BBBException e) { /* meeting doesn't exist */
            throw e;
        } 
        Map<String, Object> info = null;
        Map<String, Object> infoFromDatabase = BigBlueButtonDBWrapper.getMeetingInfo(meetingID);
        
        
        // we can get more information from BBB server if the meeting is still running
        if (api.isMeetingRunning(meetingID)) {
            info = api.getMeetingInfo(meeting);
            
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
        } else {
            info = infoFromDatabase;
        }
        
        Map<String, Object> recordingInfo = this.getRecordInfo(meetingID, null);
        if (recordingInfo.containsKey(meetingID)) {
            info.put("recording", recordingInfo.get(meetingID));
        }
        
        return info;
    }
    
    @SuppressWarnings("unchecked")
    private String getPlaybackURL(String recordingID, String meetingID, String type) throws BBBException {
        Map<String, Object> result = api.getRecordings(meetingID, recordingID);

        if (result.containsKey("messageKey") &&
                "noRecordings".equalsIgnoreCase((String) result.get("messageKey"))) {
            return null;
        }
        
        String url = "";
        ArrayList<HashMap<String, Object>> recordings =
                (ArrayList<HashMap<String, Object>>) result.get("recordings");
        for (HashMap<String, Object> recording : recordings) {
            ArrayList<Object> playbackList = (ArrayList<Object>) recording.get("playback");
            for (Object playback : playbackList) {
                HashMap<String, Object> playbackMap = (HashMap<String, Object>) playback;
                if (((String) playbackMap.get("type")).equalsIgnoreCase(type)) {
                    url += (String) playbackMap.get("url") + ",";
                }
            }
        }
        
        return url == "" ? null : url.substring(0, url.length() - 1);
    }
    
    private ArrayList<Map<String, Object>> getMeetingStat(String meetingID) throws BBBException {
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
    
    public void updateCredential(String url, String securitySalt) {
        api.setCredentials(url, securitySalt);
    }

    public JSONObject getCredential() throws JSONException {
        JSONObject obj = new JSONObject();
        obj.put("bigbluebutton_serverURL", api.getUrl());
        obj.put("bigbluebutton_securitySalt", api.getSalt());
        return obj;
    }
    
    /*
     * Find the creator to the given meeting
     */
    public String findCreator(String meetingID) throws BBBException {
        return BigBlueButtonDBWrapper.findCreator(meetingID);
    }
    
    /*
     * find the meetingID that relates to the given appointment
     */
    public String findApptMeetingID(String uid) throws BBBException {
        return BigBlueButtonDBWrapper.findApptMeetingID(uid);
    }
    
    public boolean meetingHasEnded(String meetingID) throws BBBException {
        return BigBlueButtonDBWrapper.meetingHasEnded(meetingID);
    }
    
    // This function will generate a random meeting ID like "XXX-XXX-XXX"
    // where each X can be a letter (upper case or lower case) or a digit
    public String getRandomMeetingID() throws BBBException {
        Random r = new Random();
        do {
            String meetingID = "";
            for (int i = 0; i < 9; ++i) {
                int randomInt = r.nextInt(3);
                char nextChar;
                if (randomInt == 0) {
                    nextChar = (char)(r.nextInt(9) + '0');
                } else if (randomInt == 1) {
                    nextChar = (char)(r.nextInt(26) + 'a');
                } else {
                    nextChar = (char)(r.nextInt(26) + 'A');
                }
                meetingID += nextChar;
                if ((i + 1) % 3 == 0 && i != 8) {
                    meetingID += "-";
                }
            }
            
            try {
                // another meeting with the same meeting ID is already running
                // in BigBlueButton server, try a new meeting id
                if (api.isMeetingRunning(meetingID)) {
                    continue;
                }
                findMeeting(meetingID); /* if the meeting doesn't exist, this statement will throw an exception */
                continue; // meeting already exist, need to retry
            } catch (BBBException e) {
                if (!e.getMessageKey().equalsIgnoreCase(BBBException.MESSAGEKEY_NOTFOUND)) {
                    throw e;
                }
            }
            
            return meetingID;
        } while (true);
    }

    /*
     * Update the information stored in database with new meeting name, attendees and whether
     * record the meeting or not
     */
    public void createMeeting(String meetingID, String email, String meetingName,
            boolean recording) throws BBBException {
        BigBlueButtonDBWrapper.addMeeting(meetingID, email, meetingName, recording);
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
        return api.getJoinMeetingURL(meetingID, meeting.getModeratorPW(), displayName, null, true);
    }
    
    /*
     * End the meeting with the given meetingID, return true is the meeting is successfully ended or
     * the meeting doesn't exist, return false otherwise (i.e., the provided email is not the creator's email)
     */
    public boolean endMeeting(String meetingID, String email) throws BBBException {
        authenticateUpdateMeeting(meetingID, email);

        if (meetingHasEnded(meetingID)) {
            throw new BBBException(BBBException.MESSAGEKEY_GENERALERROR,
                    "Meeting " + meetingID + " has already ended!");
        }

        boolean result = api.endMeeting(findMeeting(meetingID));
        if (result == true) { /* end the meeting in the database */
            BigBlueButtonDBWrapper.endMeeting(meetingID);
        }

        sendMeetingSummaryEmail(meetingID, email);
        return result;
    }

    public String createEmailMeeting(String meetingName, String email) throws BBBException {
        String meetingID = getRandomMeetingID();
        createMeeting(meetingID, email, meetingName, false);
        return meetingID;
    }
    
    public Map<String, Object> getMeetingSummary(String meetingID, String email) throws BBBException {
        authenticateUpdateMeeting(meetingID, email);
        return getMeetingInfo(meetingID);
    }

    public void createApptMeeting(String meetingName, String organizer,
            String uid) throws BBBException {
        String meetingID = getRandomMeetingID();
        createMeeting(meetingID, organizer, meetingName, false);
        BigBlueButtonDBWrapper.addApptMeeting(uid, meetingID);
    }
    
    public String getJoinApptMeetingURL(String meetingName, String displayName, String organizer,
            String uid, String email) throws BBBException {
        String meetingID = findApptMeetingID(uid);
        return getJoinMeetingURL(meetingID, displayName, email);
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
    
    public int getNumLiveAttendeeForApptMeeting(String uid) throws BBBException {
        String meetingID = findApptMeetingID(uid);
        return getNumLiveAttendee(meetingID);
    }
    
    public boolean endApptMeeting(String uid, String creator) throws BBBException {
        String meetingID = findApptMeetingID(uid);
        return endMeeting(meetingID, creator);
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
            return;
        } else if (!BigBlueButtonDBWrapper.authenticateEndMeeting(meetingID, securitySalt)) {
            throw new BBBException(BBBException.MESSAGEKEY_UNREACHABLE, "Authentication failed.");
        }
        
        BigBlueButtonDBWrapper.endMeeting(meetingID);
        sendMeetingSummaryEmail(meetingID, findCreator(meetingID)); 
    }
    
    // This function is used to verify that the BigBlueButton server url and the security salt
    // is valid so that the admin user will not accidentally provide the wrong url/salt which
    // will cause all functionalities provided by BigBlueButton zimlet to fail. This function
    // will make an api call the new url that is provided and check if the response is valid
    public void verifyBigBlueButtonServer(String url, String salt) throws BBBException {
        BaseBBBAPI testApi = new BaseBBBAPI(url, salt);
        
        try {
            testApi.getMeetings();
        } catch (BBBException e) {
            if (e.getMessage().equalsIgnoreCase("You did not pass the checksum security check")) {
                throw new BBBException(e.getMessageKey(), "Incorrect security salt provided!");
            } else {
                throw new BBBException(e.getMessageKey(), "Invalid/unreachable server provided!");
            }
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
    
    public String getPlaybackURL(String recordingID, String meetingID) throws BBBException {
        String url = getPlaybackURL(recordingID, meetingID, "presentation");
        if (url != null && url != "")
            return url;
        return getPlaybackURL(recordingID, meetingID, "video");
    }
    
    public static final String getEndMeetingCallbackURL(String meetingID, String securitySalt) {
        return MEETING_END_URL + "&bigbluebutton_meetingID=" + meetingID +
                "&bigbluebutton_securitySalt=" + securitySalt;
    }
}
