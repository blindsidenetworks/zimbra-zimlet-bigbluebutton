package Blindside;

import com.zimbra.common.service.ServiceException;
import com.zimbra.cs.db.DbPool;

import BigBlueButton.api.BBBException;
import BigBlueButton.api.BBBMeeting;

import java.sql.Connection;
import java.sql.Statement;
import java.sql.Timestamp;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.Map;

import org.json.JSONObject;

import java.sql.DatabaseMetaData;
import java.sql.PreparedStatement;
import java.sql.ResultSet;
import java.sql.SQLException;

public class BigBlueButtonDBWrapper {
    private static Connection conn = null;
    private static final String BBB_MEETING_TABLE     = "BBB_Meeting";
    private static final String BBB_APPTMEETING_TABLE = "BBB_ApptMeeting";
    private static final String BBB_PREFERENCE_TABLE  = "BBB_Preference";
    private static final String CREATE_TABLE_SQL      = "CREATE TABLE " + BBB_MEETING_TABLE + " " +
                                                        "(meetingID VARCHAR(100) NOT NULL UNIQUE, " +
                                                        " meetingName VARCHAR(100), " +
                                                        " moderatorPW VARCHAR(100), " +
                                                        " attendeePW VARCHAR(100), " +
                                                        " record BOOLEAN, " +
                                                        " creatorEmail VARCHAR(100) NOT NULL, " +
                                                        " createTime TIMESTAMP NULL, " +
                                                        " attendees VARCHAR(1000) DEFAULT '', " +
                                                        " ended BOOLEAN DEFAULT FALSE, " + 
                                                        " endTime TIMESTAMP, " +
                                                        " PRIMARY KEY ( meetingID ))";
    private static final String CREATE_APPTTABLE_SQL  = "CREATE TABLE " + BBB_APPTMEETING_TABLE + " " +
                                                        "(appointmentID VARCHAR(100) NOT NULL UNIQUE, " +
                                                        " meetingID VARCHAR(100) NOT NULL, " +
                                                        " PRIMARY KEY (appointmentID), " +
                                                        " FOREIGN KEY (meetingID) REFERENCES " +
                                                        BBB_MEETING_TABLE + "(meetingID))";
    
    private static final String INSERT_TABLE_SQL      = "INSERT INTO " + BBB_MEETING_TABLE +
                                                        "(meetingID, meetingName, moderatorPW, attendeePW," +
                                                        " record, creatorEmail, createTime) " +
                                                        "VALUES(?, ?, ?, ?, ?, ?, ?)";
    
    private static final String FIND_MEETING_SQL      = "SELECT * FROM " + BBB_MEETING_TABLE + " WHERE meetingID = ?";
    private static final String FIND_CREATOR_SQL      = "SELECT creatorEmail FROM " + BBB_MEETING_TABLE +
                                                        " WHERE meetingID = ?";
    private static final String FIND_MODETATORPW_SQL  = "SELECT moderatorPW FROM " + BBB_MEETING_TABLE +
                                                        " WHERE meetingID = ?";
    private static final String UPDATE_MEETING_SQL    = "UPDATE " + BBB_MEETING_TABLE +
                                                        " SET moderatorPW = ?, attendeePW = ? WHERE meetingID = ?";
    private static final String FIND_MEETING_STATUS   = "SELECT ended FROM " + BBB_MEETING_TABLE + " WHERE meetingID = ?";
    private static final String END_MEETING_SQL       = "UPDATE " + BBB_MEETING_TABLE + " SET ended = true, endTime = ?" +
                                                        " WHERE meetingID = ?";
    private static final String FIND_ATTENDEE_SQL     = "SELECT attendees from " + BBB_MEETING_TABLE +
                                                        " WHERE meetingID = ?";
    private static final String FIND_USERMEETING_SQL  = "SELECT meetingID, meetingName, createTime from " + BBB_MEETING_TABLE +
                                                        " WHERE creatorEmail = ?";
    private static final String FIND_ACTIVEMEETING_SQL= "SELECT meetingID, meetingName, createTime from " + BBB_MEETING_TABLE +
                                                        " WHERE creatorEmail = ? and ended = false";
    private static final String SET_ATTENDEE_SQL      = "UPDATE " + BBB_MEETING_TABLE +
                                                        " SET attendees = ? WHERE meetingID = ?";
    
    private static final String INSERT_APPTMEETING_SQL= "INSERT INTO " + BBB_APPTMEETING_TABLE +
                                                        "(appointmentID, meetingID) " +
                                                        "VALUES(?, ?)";
    private static final String FIND_APPTMEETING_SQL  = "SELECT meetingID FROM " + BBB_APPTMEETING_TABLE + " WHERE appointmentID = ?";
    
    private static final String CREATE_PREFTABLE_SQL  = "CREATE TABLE " + BBB_PREFERENCE_TABLE + " " +
                                                        "(id VARCHAR(100) NOT NULL UNIQUE, " +
                                                        " displayName VARCHAR(100) NOT NULL, " +
                                                        " showInvitation BOOLEAN DEFAULT TRUE, " +
                                                        " PRIMARY KEY (id))";
    private static final String GET_PREFERENCE_SQL    = "SELECT displayName, showInvitation FROM " + BBB_PREFERENCE_TABLE +
                                                        " WHERE id = ?";
    private static final String GET_DISPLAYNAME_SQL   = "SELECT displayName FROM " + BBB_PREFERENCE_TABLE +
                                                        " WHERE id = ?";
    private static final String INSERT_PREFERENCE_SQL = "INSERT INTO " + BBB_PREFERENCE_TABLE + 
                                                        "(id, displayName, showInvitation) " + "VALUES(?, ?, ?)";
    private static final String UPDATE_PREFERENCE_SQL = "UPDATE " + BBB_PREFERENCE_TABLE + 
                                                        " SET displayName = ?, showInvitation = ? WHERE id = ?";
    
    private static void initializeConnection() throws ServiceException {
        conn = DbPool.getConnection().getConnection();
    }
    
    public static void closeConnection() throws SQLException {
        conn.commit(); /* commit the changes to the database */
        conn.close();
    }
    
    /*
     * Add the meeting to the Meeting table
     */
    public static void addMeeting(BBBMeeting meeting, String creatorEmail) throws BBBException {
        try {
            initializeConnection();
            String meetingID = meeting.getMeetingID();
            PreparedStatement stmt = conn.prepareStatement(INSERT_TABLE_SQL);
            stmt.setString(1, meetingID);
            stmt.setString(2, meeting.getName());
            stmt.setString(3, meeting.getModeratorPW());
            stmt.setString(4, meeting.getAttendeePW());
            stmt.setBoolean(5, meeting.getAutoStartRecording());
            stmt.setString(6, creatorEmail);
            stmt.setTimestamp(7, new Timestamp(System.currentTimeMillis()));
            stmt.executeUpdate();
            conn.commit();
        } catch (Exception e) {
            throw new BBBException(BBBException.MESSAGEKEY_GENERALERROR,
                    "Failed to save meeting " + meeting.getMeetingID() + ": " + e.getMessage());
        }
    }
    
    /*
     * Add the appointment id and corresponding meeting id to the database
     */
    public static void addApptMeeting(String appointmentID, String meetingID) throws BBBException {
        try {
            initializeConnection();
            PreparedStatement stmt = conn.prepareStatement(INSERT_APPTMEETING_SQL);
            stmt.setString(1, appointmentID);
            stmt.setString(2, meetingID);
            stmt.executeUpdate();
            conn.commit();
        } catch (Exception e) {
            throw new BBBException(BBBException.MESSAGEKEY_GENERALERROR,
                    "Failed to save meeting " + meetingID + ": " + e.getMessage());
        }
    }
    
    /*
     * Update the meeting in the database with the new password, this function is called
     * after a meeting has been created on Zimbra server but not BigBlueButton server
     */
    public static void updateMeeting(BBBMeeting meeting) throws BBBException {
        try {
            initializeConnection();
            PreparedStatement stmt = conn.prepareStatement(UPDATE_MEETING_SQL);
            stmt.setString(1, meeting.getModeratorPW());
            stmt.setString(2, meeting.getAttendeePW());
            stmt.setString(3, meeting.getMeetingID());
            stmt.executeUpdate();
            conn.commit();
        } catch (Exception e) {
            throw new BBBException(BBBException.MESSAGEKEY_GENERALERROR,
                    "Failed to save meeting " + meeting.getMeetingID() + ": " + e.getMessage());
        }
    }
    
    /*
     * Find the meeting with the given meetingID from the database
     */
    public static BBBMeeting findMeeting(String meetingID) throws BBBException {
        try {
            initializeConnection();
            PreparedStatement stmt = conn.prepareStatement(FIND_MEETING_SQL);
            stmt.setString(1, meetingID);
            ResultSet rs = stmt.executeQuery();
            while (rs.next()) {
                BBBMeeting meeting = new BBBMeeting(meetingID);
                meeting.setName(rs.getString("meetingName"));
                meeting.setModeratorPW(rs.getString("moderatorPW"));
                meeting.setAttendeePW(rs.getString("attendeePW"));
                meeting.setRecord(true);
                meeting.setAutoStartRecording(rs.getBoolean("record"));
                meeting.setAllowStartStopRecording(true);
                meeting.addMeta("bn-recording-ready-url", BigBlueButtonWrapper.RECORDING_READY_URL);
                meeting.addMeta("endcallbackurl",
                        BigBlueButtonWrapper.getEndMeetingCallbackURL(meetingID, "a"));
                return meeting;
            }
            throw new BBBException(BBBException.MESSAGEKEY_NOTFOUND,
                    "Meeting " + meetingID + " doesnot exist!");
        } catch (Exception e) {
            if (e instanceof BBBException) {
                throw (BBBException) e;
            }
            throw new BBBException(BBBException.MESSAGEKEY_GENERALERROR,
                    "Failed to get meeting " + meetingID + ": " + e.getMessage());
        }
    }
    
    /*
     * Find the meeting with the given appointment ID
     */
    public static String findApptMeetingID(String appointmentID) throws BBBException {
        try {
            initializeConnection();
            PreparedStatement stmt = conn.prepareStatement(FIND_APPTMEETING_SQL);
            stmt.setString(1, appointmentID);
            ResultSet rs = stmt.executeQuery();
            while (rs.next()) {
                return rs.getString("meetingID");
            }
            throw new BBBException(BBBException.MESSAGEKEY_NOTFOUND,
                    "BigBlueButton meeting has not been created for this appointment!");
        } catch (Exception e) {
            if (e instanceof BBBException) {
                throw (BBBException) e;
            }
            throw new BBBException(BBBException.MESSAGEKEY_GENERALERROR,
                    "Failed to get meeting: " + e.getMessage());
        }
    }
    
    /*
     * Return the creator email of the meeting with the given meetingID
     */
    public static String findCreator(String meetingID) throws BBBException {
        try {
            initializeConnection();
            PreparedStatement stmt = conn.prepareStatement(FIND_CREATOR_SQL);
            stmt.setString(1, meetingID);
            ResultSet rs = stmt.executeQuery();
            while (rs.next()) {
                return rs.getString("creatorEmail");
            }
            throw new BBBException(BBBException.MESSAGEKEY_NOTFOUND,
                    "Meeting " + meetingID + " doesnot exist!");
        } catch (Exception e) {
            if (e instanceof BBBException) {
                throw (BBBException) e;
            }
            throw new BBBException(BBBException.MESSAGEKEY_GENERALERROR,
                    "Failed to get meeting " + meetingID + ": " + e.getMessage());
        }
    }
    
    private static String findModeratorPW(String meetingID) throws BBBException {
        try {
            initializeConnection();
            PreparedStatement stmt = conn.prepareStatement(FIND_MODETATORPW_SQL);
            stmt.setString(1, meetingID);
            ResultSet rs = stmt.executeQuery();
            while (rs.next()) {
                return rs.getString("moderatorPW");
            }
            throw new BBBException(BBBException.MESSAGEKEY_NOTFOUND,
                    "Meeting " + meetingID + " doesnot exist!");
        } catch (Exception e) {
            if (e instanceof BBBException) {
                throw (BBBException) e;
            }
            throw new BBBException(BBBException.MESSAGEKEY_GENERALERROR,
                    "Failed to get meeting " + meetingID + ": " + e.getMessage());
        }
    }
    
    /*
     * End the meeting with the given meetingID from database, once a meeting has been marked
     * as ended, all future join request will be refused and returned a 400 bad request.
     */
    public static void endMeeting(String meetingID) throws BBBException {
        try {
            initializeConnection();
            PreparedStatement stmt = conn.prepareStatement(END_MEETING_SQL);
            stmt.setTimestamp(1, new Timestamp(System.currentTimeMillis()));
            stmt.setString(2, meetingID);
            stmt.executeUpdate();
            conn.commit();
        } catch (Exception e) {
            if (e instanceof BBBException) {
                throw (BBBException) e;
            }
            throw new BBBException(BBBException.MESSAGEKEY_GENERALERROR,
                    "Failed to end meeting " + meetingID + ": " + e.getMessage());
        }
    }
    
    /*
     * This function makes sure that 'BBB_Meeting', 'BBB_ApptMeeting' and 'BBB_Preference' tables exist
     * in sql database so that they can be used for saving information.
     */
    public static void makeSureTableExist() throws Exception {
        initializeConnection();
        Statement stmt = conn.createStatement();
        DatabaseMetaData md = conn.getMetaData();
        ResultSet tables = md.getTables(null, null, BBB_MEETING_TABLE, null);
        if (!tables.next()) { /* table doesn't exist, create one */
            stmt.executeUpdate(CREATE_TABLE_SQL);
        }     
        tables = md.getTables(null, null, BBB_APPTMEETING_TABLE, null);
        if (!tables.next()) { /* table doesn't exist, create one */
            stmt.executeUpdate(CREATE_APPTTABLE_SQL);
        }
        tables = md.getTables(null, null, BBB_PREFERENCE_TABLE, null);
        if (!tables.next()) { /* table doesn't exist, create one */
            stmt.executeUpdate(CREATE_PREFTABLE_SQL);
        }
        conn.commit();
    }

    /*
     * This function checks whether the meeting with the given meetingID has been marked
     * as ended, this is called every time a join meeting request is received.
     */
    public static boolean meetingHasEnded(String meetingID) throws BBBException {
        try {
            initializeConnection();
            PreparedStatement stmt = conn.prepareStatement(FIND_MEETING_STATUS);
            stmt.setString(1, meetingID);
            ResultSet rs = stmt.executeQuery();
            while (rs.next()) {
                return rs.getBoolean("ended");
            }
            throw new BBBException(BBBException.MESSAGEKEY_NOTFOUND,
                    "Meeting " + meetingID + " doesnot exist!");
        } catch (Exception e) {
            if (e instanceof BBBException) {
                throw (BBBException) e;
            }
            throw new BBBException(BBBException.MESSAGEKEY_GENERALERROR,
                    "Failed to get meeting: " + e.getMessage());
        }
    }
    
    /*
     * This function checks if the given email is the creator for the given meeting so that
     * only the creator can perform actions on the meeting like endMeeting.
     */
    public static boolean authenticateAction(String meetingID, String email) throws BBBException {
        return findCreator(meetingID).equalsIgnoreCase(email);
    }
    
    /*
     * This function checks if the given password matches the moderatorPW of the meeting so that
     * only user that are invited to the appointment can join the meeting.
     */
    public static boolean authenticateJoinApptMeeting(String meetingID, String password) throws BBBException {
        return findModeratorPW(meetingID).equalsIgnoreCase(password);
    }
    
    /*
     * This function saves the attendee information to the database.
     */
    public static void addAttendee(String meetingID, String displayName, String attendeeEmail) throws BBBException {
        try {
            initializeConnection();
            PreparedStatement stmt = conn.prepareStatement(FIND_ATTENDEE_SQL);
            stmt.setString(1, meetingID);
            ResultSet rs = stmt.executeQuery();
            String attendees = "";
            while (rs.next()) {
                attendees += rs.getString("attendees");
            }
            if (attendeeEmail != null && attendees.indexOf(attendeeEmail) != -1) // attendee email already recorded
                return;
            attendees += attendees.equalsIgnoreCase("") ? "" : ",";
            attendees += displayName + (attendeeEmail == null ? "" : ":" + attendeeEmail);
            
            stmt = conn.prepareStatement(SET_ATTENDEE_SQL);
            stmt.setString(1, attendees);
            stmt.setString(2, meetingID);
            stmt.executeUpdate();
            conn.commit();
        } catch (Exception e) {
            throw new BBBException(BBBException.MESSAGEKEY_GENERALERROR,
                    "Failed to save attendee " + displayName + ": " + e.getMessage());
        }
    }
    
    /*
     * This function returns a list of information relates to the given meeting.
     */
    public static Map<String, Object> getMeetingInfo(String meetingID) throws BBBException {
        try {
            initializeConnection();
            Map<String, Object> info = new HashMap<String, Object>();
            PreparedStatement stmt = conn.prepareStatement(FIND_MEETING_SQL);
            stmt.setString(1, meetingID);
            ResultSet rs = stmt.executeQuery();
            while (rs.next()) {
                info.put("meetingID", meetingID);
                info.put("createTime", rs.getTimestamp("createTime").getTime());
                if (rs.getTimestamp("endTime") != null && rs.getTimestamp("endTime").getTime() > 0) {
                    info.put("endTime", rs.getTimestamp("endTime").getTime());
                }
                ArrayList<Map<String, String>> attendeesAList = new ArrayList<Map<String, String>>();
                String attendees = rs.getString("attendees");
                String[] attendeesList = attendees.split(",");
                for (String attendee : attendeesList) {
                    if (attendee.equalsIgnoreCase("")) {
                        continue;
                    }
                    String[] attendeeInfo = attendee.split(":");
                    String displayName = attendeeInfo[0];
                    String email = attendeeInfo.length > 1 ? attendeeInfo[1] : null;
                    Map<String, String> attendeeInfoMap = new HashMap<String, String>();
                    attendeeInfoMap.put("fullName", displayName);
                    attendeeInfoMap.put("email", email);
                    attendeesAList.add(attendeeInfoMap);
                }
                info.put("attendees", attendeesAList);
                info.put("meetingName", rs.getString("meetingName"));
            }
            
            return info;
        } catch (Exception e) {
            throw new BBBException(BBBException.MESSAGEKEY_GENERALERROR,
                    "Failed to find meeting information: " + e.getMessage());
        }
    }

    public static JSONObject getPreference(String id) throws BBBException {
        try {
            initializeConnection();
            PreparedStatement stmt = conn.prepareStatement(GET_PREFERENCE_SQL);
            stmt.setString(1, id);
            ResultSet rs = stmt.executeQuery();
            while (rs.next()) {
                JSONObject obj = new JSONObject();
                obj.put("displayName", rs.getString("displayName"));
                obj.put("showInvitation", rs.getBoolean("showInvitation"));
                return obj;
            }
            return null;
        } catch (Exception e) {
            throw new BBBException(BBBException.MESSAGEKEY_GENERALERROR,
                    "Failed to get preference for user " + id + ": " + e.getMessage());
        }
    }
    
    public static String getDisplayName(String id) throws BBBException {
        try {
            initializeConnection();
            PreparedStatement stmt = conn.prepareStatement(GET_DISPLAYNAME_SQL);
            stmt.setString(1, id);
            ResultSet rs = stmt.executeQuery();
            while (rs.next()) {
                return rs.getString("displayName");
            }
            return null;
        } catch (Exception e) {
            throw new BBBException(BBBException.MESSAGEKEY_GENERALERROR,
                    "Failed to get display name for user " + id + ": " + e.getMessage());
        }
    }
    
    public static void updatePreference(String id, String displayName, boolean showInvitation) throws BBBException {
        try {
            initializeConnection();
            PreparedStatement stmt = conn.prepareStatement(INSERT_PREFERENCE_SQL);
            stmt.setString(1, id);
            stmt.setString(2, displayName);
            stmt.setBoolean(3, showInvitation);
            stmt.executeUpdate();
            conn.commit();
        } catch (Exception e) {
            try { // if old display name exist, try to update it
                PreparedStatement stmt = conn.prepareStatement(UPDATE_PREFERENCE_SQL);
                stmt.setString(1, displayName);
                stmt.setBoolean(2, showInvitation);
                stmt.setString(3, id);
                stmt.executeUpdate();
                conn.commit();
            } catch (SQLException e1) {
                throw new BBBException(BBBException.MESSAGEKEY_GENERALERROR,
                        "Failed to update preference for user " + id + ": " + e1.getMessage());
            }
        }
    }
    
    public static String getUserCreatedMeeting(String userEmail) throws BBBException {
        return getUserCreatedMeeting(userEmail, false);
    }

    public static String getUserCreatedMeeting(String userEmail, Boolean activeOnly) throws BBBException {
        try {
            initializeConnection();
            PreparedStatement stmt = activeOnly ? conn.prepareStatement(FIND_ACTIVEMEETING_SQL) :
                conn.prepareStatement(FIND_USERMEETING_SQL);
            stmt.setString(1, userEmail);
            ResultSet rs = stmt.executeQuery();
            String meetings = "";
            while (rs.next()) {
                if (rs.getString("meetingName") != null) {
                    meetings += rs.getString("meetingName") + ":";
                }
                meetings += rs.getString("meetingID") +
                        "@" + rs.getTimestamp("createTime").getTime() + ",";
            }
            stmt.close();
            return meetings.equalsIgnoreCase("") ? meetings :
                meetings.substring(0, meetings.length() - 1); // remove the last ','
        } catch (Exception e) {
            throw new BBBException(BBBException.MESSAGEKEY_GENERALERROR,
                    "Failed to get meetings for user " + userEmail + ": " + e.getMessage());
        }
    }

    // TO DO: implement some method to authenticate the end meeting callback so that other user
    // will not be able to guess the url and fake an api call to zimbra server
    public static boolean authenticateEndMeeting(String meetingID, String securitySalt) {
        return true;
    }
}
