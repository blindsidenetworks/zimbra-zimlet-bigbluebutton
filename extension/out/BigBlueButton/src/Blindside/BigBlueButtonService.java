package Blindside;

import com.zimbra.soap.DocumentDispatcher;
import com.zimbra.soap.DocumentService;
import org.dom4j.Namespace;
import org.dom4j.QName;

public class BigBlueButtonService implements DocumentService {
    public static final Namespace namespace = Namespace.get("urn:BigBlueButton");
    private BigBlueButtonExt ext;
    
    public BigBlueButtonService(BigBlueButtonExt ext) {
        this.ext = ext;
    }
    
    @Override
    public void registerHandlers(DocumentDispatcher dispatcher) {
        dispatcher.registerHandler(QName.get("BigBlueButton", namespace), new BigBlueButtonSoapHandler(ext));
    }

}
