package Blindside;

import org.dom4j.Namespace;
import org.dom4j.QName;

import com.zimbra.soap.DocumentDispatcher;
import com.zimbra.soap.DocumentService;

public class BigBlueButtonAdminService implements DocumentService {
    public static final Namespace namespace = Namespace.get("urn:BigBlueButtonAdmin");
    private BigBlueButtonExt ext;
    
    public BigBlueButtonAdminService(BigBlueButtonExt ext) {
        this.ext = ext;
    }
    @Override
    public void registerHandlers(DocumentDispatcher dispatcher) {
        dispatcher.registerHandler(QName.get("BigBlueButtonAdmin",namespace), new BigBlueButtonAdminSoapHandler(ext));
    }

}
