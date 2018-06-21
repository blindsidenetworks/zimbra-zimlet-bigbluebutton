package Blindside;

import java.util.Properties;

import org.json.JSONException;
import org.json.JSONObject;

import com.zimbra.common.service.ServiceException;
import com.zimbra.common.util.SystemUtil;
import com.zimbra.common.util.ZimbraLog;
import com.zimbra.cs.extension.ExtensionDispatcherServlet;
import com.zimbra.cs.extension.ZimbraExtension;
import com.zimbra.soap.SoapServlet;

public class BigBlueButtonExt implements ZimbraExtension {
    public static final String CONFIG_FILE                = "/opt/zimbra/conf/BigBlueButton.properties";
    public static final String HTML_JOINMEETING_TEMPLATE  = "/opt/zimbra/lib/ext/BigBlueButton/joinMeeting.html";
    public static final String HTML_MEETINGENDED_TEMPLATE = "/opt/zimbra/lib/ext/BigBlueButton/meetingEnded.html";
    public static final String HTML_EndMeeting_TEMPLATE   = "/opt/zimbra/lib/ext/BigBlueButton/endMeeting.html";
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
            Properties prop = BigBlueButtonHelper.getProperties(CONFIG_FILE);
            this.bbb = new BigBlueButtonWrapper(prop.getProperty("URL"), prop.getProperty("securitySalt"));
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
