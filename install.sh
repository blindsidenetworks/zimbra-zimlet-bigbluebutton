set -e
# uncomment the following line if you want to trace the script
# set -x

# make sure the script can only be executed by root
if [ "$(id -u)" != "0" ]; then
  echo "Please run the script as root" 1>&2
  exit 1
fi

if [ "$1" == "-u" ] || [ "$1" == "-uninstall" ]; then
  echo "Uninstalling BigBlueButton"
  su - zimbra -c "zmzimletctl undeploy com_zimbra_bigbluebutton" # uninstall zimlet
  rm -Rf /opt/zimbra/zimlets-deployed/com_zimbra_bigbluebutton
  rm -Rf /opt/zimbra/lib/ext/BigBlueButton # remove server extension

  echo "----------------------------------------------------------------------------------"
  echo "BigBlueButton uninstalled successfully."
  echo
  echo "Please note that BigBlueButton has created several tables in the sql database for storing all necessary information. To delete these tables, you can restart the mailboxd service first and then run the following command:"
  echo "su - zimbra -c \"mysql -D zimbra -e 'DROP TABLE IF EXISTS BBB_ApptMeeting, BBB_Meeting'\""
else
  cwd=$(pwd)
  serverExt="/opt/zimbra/lib/ext/BigBlueButton"

  # make sure zip is installed
  set +e
  ZIP_CMD=$(which zip)
  set -e
  if [[ -z $ZIP_CMD ]]; then
    apt-get install zip
  fi

  echo "Remove existing BigBlueButton"
  rm -Rf /opt/zimbra/zimlets-deployed/com_zimbra_bigbluebutton
  rm -Rf /opt/zimbra/lib/ext/BigBlueButton

  echo "Installing BigBlueButton"
  echo "Deploy BigBlueButton zimlet"
  cd $cwd/zimlet/
  zip -r $cwd/com_zimbra_bigbluebutton.zip *
  su - zimbra -c "zmzimletctl deploy $cwd/com_zimbra_bigbluebutton.zip"

  echo "Deploy BigBlueButton server extension"
  # Create folder for server extension
  mkdir -p $serverExt
  cp $cwd/extension/out/BigBlueButton/BigBlueButton.jar $serverExt/BigBlueButton.jar
  chmod 444 $cwd/template/*
  cp $cwd/template/* $serverExt/

  echo "Installing BigBlueButton admin"
  echo "Deploy BigBlueButton admin zimlet"
  cd $cwd/adminZimlet/
  zip -r $cwd/com_zimbra_bigbluebutton_admin.zip *
  su - zimbra -c "zmzimletctl deploy $cwd/com_zimbra_bigbluebutton_admin.zip"

  echo "----------------------------------------------------------------------------------"
  echo "BigBlueButton installed successfully."
  echo 
  echo "However, you need to disable csrf token check to fix the Zimbra Web Client AJAX problem such that the application can execute successfully, more information about this bug can be found here:"
  echo "https://wiki.zimbra.com/wiki/Fix_a_Zimbra_Web_Client_AJAX_problem_after_upgraded_to_ZCS_8.6"
  echo
  echo "su - zimbra -c \"zmprov mcf zimbraCsrfTokenCheckEnabled FALSE\""
fi

echo
echo "You still need to restart mailboxd to load the changes:"
echo "su - zimbra -c \"zmmailboxdctl restart\""
echo
echo "For more information about BigBlueButton, please refer to the following link:"
echo "https://bigbluebutton.org/"
echo