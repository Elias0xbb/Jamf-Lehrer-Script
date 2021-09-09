#!/bin/bash
#correct-jamf-classes - A simple script to start a JavaScript-Script using node. Supports setting certain options/parameters to start the JS-Script with
#The JS-Script reads all the groups and classes from a Jamf School Server, deleting classes without groups, making new classes for groups without a classs and
#editing all classes to match their corresponding groups in terms of students and teachers.
#
#For all argument usage see below

node_script_path="./src/start.js"
documentation_path="$(realpath ../documentation.pdf)" #realpath gives the absolute path: https://stackoverflow.com/questions/3915040/how-to-obtain-the-absolute-path-of-a-file-via-shell-bash-zsh-sh
config_change_temporary=false
reset_classes=false

display_help_page() {
	echo "$(basename "$0"): Edit the configuration of the main program."
	echo "Optionally also start the program afterwards."
	echo ""
	echo "Options:"
	echo "	[-h|--help]				Displays this page."
	echo "	[-s|--start]				Start the program after editing the configuration (or, if configuration remains unchanged,"
	echo "						only start the program)."
	echo "	[-r|--reset-classes]			If running the program ('-s'), delete all classes before the correction."
	echo "	[-t|--temporary]			Start the program with the selected options, but restore the old configuration afterwards."
	echo "						IMPORTANT: Also pass ’-s’ to use this option!"
	echo "	[-a|--authorization] username:password	Tries to log into the Jamf-Server using the specified username and password."
	echo "						Current value: Not available for security reasons."
	echo "	[-l|--logfile] file			Redirects logging to the specified file."
	echo "						Default file is ./logFiles/log.txt (relative to the location of main.js)."
	echo "	[--enable-logging] [true|false]		Disables or enables output to the logfile."
	echo "						Current value: $_enable_logging."
	echo "	[--enable-log-chaining] [true|false]	If this option is selected, the logfile will not be cleared before running the program."
	echo "						Current value: $_enable_log_chaining."
	echo "	[--tg-id|--teachergroup-id] id		Sets the group-ID the programm will search for in order to attain the teachers group."
	echo " 						Current value: '$_teachergroup_id'."
	echo "	[--tg-name|--teachergroup-name] name	Sets the groupname the program will search for in order to attain the teachers group."
	echo "						This option will only be used if no group with found using the teachergroup-id."
	echo "						Current value: \"$_teachergroup_name\"."
	echo "	[-cd|--class-description] name		Sets the description classes created by the program receive."
	echo "						ATTENTION: This forces a class reset if not already set by '-r'!"
	echo "						Current value: '$_class_description'."
	echo "	[--min-valid-groups] value		Set the number of groups that have to be valid in order for the program to not terminate."
	echo "						Current value: $_min_valid_groups."
	echo "	[--corrected-students-limit] value	Set the number of students that can be corrected in a class without deleting and recreating the class."
	echo "						Current value: $_corrected_students_limit."
	echo "	[--corrected-teachers-limit] value	Set the number of teacherss that can be corrected in a class without deleting and recreating the class."
	echo "						Current value: $_corrected_teachers_limit."
	echo "	[--enable-colored-output] [true|false]	Enable or disable colored console outputs."
	echo "						Current value: $_enable_colored_output."
	echo "	[--progressbar-width] width		Sets the width of the progress bar displayed by the program."
	echo "						Current value: $_progressbar_width."
	echo "	[--progressbar-pretext] text		Set the text that is displayed in front of the progessbar. Can be used to adjust offset."
	echo "						ATTENTION: Remember to quote if using spaces to adjust offset!"
	echo "						Current value: \"$_progressbar_pretext\"."
}

#check if node script path is valid
if [ ! -e "$node_script_path"  ] #-e checks whether the file at the given path exists and is non empty: https://mywiki.wooledge.org/BashGuide/TestsAndConditionals
then {
	echo "The file at $node_script_path does not exist or is empty! Please make sure 'node_script_path' points to the correct script!" >&2
	exit 1
} fi

node_js_args="{"

#process all the arguments by shifting of the positional parameters
while [ -n "$1" ] #-n returns true if string is not empty #$1 is always the first positional parameter even if sourced (as tests show)
do {
	case "$1" in
		-h|--help)
			display_help_page; exit 0;;
		-s)
			node_js_args+="\"start\":true,";;
		-r|--reset-classes)
			reset_classes=true;
			node_js_args+="\"resetClasses\":true,";;
		-t|--temporary)
			config_change_temporary=true;;
		-a|--authorization)
			authcode="$2"; shift;
			if [[ ! "$authcode" = +(0|1|2|3|4|5|6|7|8|9):* ]] #'+(list)' checks for one or more occurances of the specified list of patterns: https://mywiki.wooledge.org/BashGuide/Patterns (doesn't seem to be working with brace extension tho sadly)
			then {
				echo "Invalid authorization \"$authcode\". Please make sure username and password are valid and seperated by ':'." >&2;
				exit 1;
			}
			else node_js_args+="\"authcode\":\"$authcode\",";
			fi;;
		-l|--logfile)
			logfile_path="$(realpath "$2")"; shift; #need to get the absolute path in case the specified path is relative
			#apparently the program already checks for the logfile and creates a new one if the specified file does not exist
			node_js_args+="\"lfg_dirPath\":\"$(dirname "$logfile_path")\","; #dir and filename needs to be seperated for the JS-Script for some reason
			node_js_args+="\"lfg_logFileName\":\"$(basename "$logfile_path")\",";
			node_js_args+="\"lfg_enableLogFile\":true,";; #lets force enable of the logfile just to be sure
		--enable-logging)
			enable_logging="$2"; shift;
			if [[ "$enable_logging" != @("true"|"false") ]]
			then echo "enable-logging must be set to 'true' or to 'false'!" >&2; exit 1;
			else node_js_args+="\"lfg_enableLogFile\":$enable_logging,";
			fi;;
		--enable-log-chaining)
			enable_log_chaining="$2"; shift;
			if [ "$enable_log_chaining" = "true" ]
			then node_js_args+="\"lfg_autoClear\":false,";
			elif [ "$enable_log_chaining" = "false" ]
			then node_js_args+="\"lfg_autoClear\":true,";
			else echo "enable-log-chaing must be set to either 'true' or 'false'!" >&2; exit 1;
			fi;;
		--tg-name|--teachergroup-name)
			teachergroup_name="$2"; shift;
			if [ -z "$teachergroup_name" ] #returns true if teachergroup_name is an empty string
			then echo "teachergroup-name must not be empty!" >&2; exit 1;
			else node_js_args+="\"teacherGroupName\":\"$teachergroup_name\",";
			fi;;
		--tg-id|--teachergroup-id)
			teachergroup_id="$2"; shift;
			[ "$teachergroup_id" -eq "$teachergroup_id" ] 2>"/dev/null" #this should throw an error and exit with code above 0 if supplied variables are not numeric: https://stackoverflow.com/questions/806906/how-do-i-test-if-a-variable-is-a-number-in-bash/806923
			if [ $? -gt 0 ]
			then echo "teachergroup-id must not be empty or contain any letters (must be numeric)!" >&2; exit 1;
			else node_js_args+="\"teacherGroupID\":$teachergroup_id,";
			fi;;
		-cd|--class-description)
			class_description="$2"; shift;
			if [ -z "$class_description" ] #see --tg-name above
			then echo "class description must not be empty!" >&2; exit 1;
			else node_js_args+="\"createdClassDescription\":\"$class_description\",";
			fi;
			if [ ! $reset_classes ]
			then reset_classes=true; node_js_args+="\"resetClasses\":true,";
			fi;;
		--min-valid-groups)
			min_valid_groups="$2"; shift;
			[ "$min_valid_groups" -eq "$min_valid_groups" ] 2>"/dev/null" #see --tg-id above
			if [ $? -gt 0 ]
			then echo "min-valid-groups must not be empty or contain any letters (must be numeric)!" >&2; exit 1;
			else node_js_args+="\"minValidGroupCount\":$min_valid_groups,";
			fi;;
		--corrected-students-limit)
			corrected_students_limit="$2"; shift;
			[ "$corrected_students_limit" -eq "$corrected_students_limit" ] 2>"/dev/null" #see --tg-id above
			if [ $? -gt 0 ]
			then echo "corrected-students-limit must not be empty or contain any letters (must be numeric)!" >&2; exit 1;
			else node_js_args+="\"changedStudentsLimit\":$corrected_students_limit,";
			fi;;
		--corrected-teachers-limit)
			corrected_teachers_limit="$2"; shift;
			[ "$corrected_teachers_limit" -eq "$corrected_teachers_limit" ] 2>"/dev/null" #see --tg-id above
			if [ $? -gt 0 ]
			then echo "corrected-teachers-limit must not be empty or contain any letters (must be numeric)!" >&2; exit 1;
			else node_js_args+="\"changedTeachersLimit\":$corrected_teachers_limit,";
			fi;;
		--enable-colored-output)
			enable_colored_output="$2"; shift;
			if [[ "$enable_colored_output" != @("true"|"false") ]]
			then echo "enable-colored-output must be set to 'true' or to 'false'!" >&2; exit 1;
			else node_js_args+="\"coloredConsoleOutputs\":$enable_colored_output,";
			fi;;
		--progressbar-width)
			progressbar_width="$2"; shift;
			[ "$progressbar_width" -eq "$progressbar_width" ] 2>"/dev/null" #see --tg-id above
			if [ $? -gt 0 ]
			then echo "progressbar-width must not be empty or contain any letters (must be numeric)!" >&2; exit 1;
			else node_js_args+="\"progressBarWidth\":$progressbar_width,";
			fi;;
		--progressbar-pretext)
			#progressbar-pretext may be empty
			node_js_args+="\"progressBarOffset\":\"$2\","; shift;;
		*)
			echo "$(basename "$0"): Invalid Option '$1'"; echo "Please try '"$0" -h' for more information.">&2; exit 1;; 
	esac;
	shift;
} done

node_js_args=${node_js_args%,}
node_js_args+="}"

#echo "length of node js args ${#node_js_args}"

if [ ${#node_js_args} -gt 2 ]
then node_js_args=${node_js_args/"{"/"{\"params\":true,"}
else node_js_args=${node_js_args/"{"/"{\"params\":false"}
fi

#make a copy of current script config if specified
cd "$(dirname "$node_script_path")"
if [ ! -s "../config/scriptConfig.json" ]
then echo "Config-File not found, please make sure the directory at ’$(pwd)' is valid!" >&2; exit 1;
fi
if [ "$config_change_temporary" = "true" ]
then cp "../config/scriptConfig.json" "../config/scriptConfig.json.TEMP.OLD"
fi

echo "Trying to start JavaScript-script using the following command: node $node_script_path $node_js_args"
node "$(basename "$node_script_path")" "$node_js_args"

#restore old script config
if [ "$config_change_temporary" = "true" ]
then mv "../config/scriptConfig.json.TEMP.OLD" "../config/scriptConfig.json"
fi

exit 0

