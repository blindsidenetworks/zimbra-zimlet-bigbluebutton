package Blindside;

import org.json.JSONException;
import org.json.JSONObject;

import com.zimbra.common.service.ServiceException;
import com.zimbra.common.util.SystemUtil;
import com.zimbra.common.util.ZimbraLog;
import com.zimbra.cs.extension.ExtensionDispatcherServlet;
import com.zimbra.cs.extension.ZimbraExtension;
import com.zimbra.soap.SoapServlet;

public class BigBlueButtonExt implements ZimbraExtension {
    public static final String defaultServerURL    = "http://test-install.blindsidenetworks.com/bigbluebutton/api";
    public static final String defaultServerSecret = "8cd8ef52e8e101574e400365b55e11a6";
    
    public static final String HTML_JOINMEETING_TEMPLATE  = "/opt/zimbra/lib/ext/BigBlueButton/joinMeeting.html";
    public static final String HTML_MEETINGENDED_TEMPLATE = "/opt/zimbra/lib/ext/BigBlueButton/meetingEnded.html";
    public static final String HTML_ENDMEETING_TEMPLATE   = "/opt/zimbra/lib/ext/BigBlueButton/endMeeting.html";
    public static final String HTML_LOGOUT_TEMPLATE       = "/opt/zimbra/lib/ext/BigBlueButton/logout.html";
    private BigBlueButtonWrapper bbb;
    
    public String getName() {
        return "BigBlueButtonExt";
    }
    
    public BigBlueButtonWrapper getBBBWrapper() {
        return bbb;
    }
    
    public void updateCredential(String url, String securitySalt) {
        bbb.updateCredential(url, securitySalt);
    }
    
    public JSONObject getCredential() throws JSONException {
        return bbb.getCredential();
    }
    
    public void init() throws ServiceException {
        try {
            BigBlueButtonDBWrapper.makeSureTableExist();
            this.bbb = new BigBlueButtonWrapper(defaultServerURL, defaultServerSecret);
        } catch (Exception e) { /* Failed to load properties or create database connection */
            ZimbraLog.extensions.error(SystemUtil.getStackTrace(e));
            return;
        }
        SoapServlet.addService("SoapServlet", new BigBlueButtonService(this));
        SoapServlet.addService("AdminServlet", new BigBlueButtonAdminService(this));
        ExtensionDispatcherServlet.register(this, new BigBlueButtonHttpHandler(this));
    }

    public void destroy() {
        ExtensionDispatcherServlet.unregister(this);
        try {
            BigBlueButtonDBWrapper.closeConnection();
        } catch (Exception e) {
            ZimbraLog.extensions.error(SystemUtil.getStackTrace(e));
        }
    }
}
