
var clientId = '78512710474-gmldkv4v754u7phqgk5cj5c7a5pqrq5v.apps.googleusercontent.com';
var apiKey = 'AIzaSyChbqdw1gU-hpEvqKLORMf79jSZ15DM-bM';
var scopes = 'https://www.googleapis.com/auth/calendar';
var calendarId = 'azorko13@gmail.com';

// This function will be called once the Google APIs JavaScript client library loads.
function handleClientLoad() {
	gapi.client.setApiKey(apiKey);
	window.setTimeout(checkAuth,1);
}

// Check if user already authorized and refresh the auth token without generating an auth pop-up.
// Callback handleAuthResult is called with the returned auth token.
function checkAuth() {
	gapi.auth.authorize({client_id: clientId, scope: scopes, immediate: true}, handleAuthResult);
}

// Handle success, or failure of the authorization.
function handleAuthResult(authResult) {
	var authorizeButton = document.getElementById('authorize-button');

  // Successful authorization: hide the authorize-button and make the api call.
	if (authResult && !authResult.error) {
		authorizeButton.style.visibility = 'hidden';
		makeApiCall(calendarId);
  // Failed authorization: show the authorize-button and set the button's click handler.
	} else {
		authorizeButton.style.visibility = '';
		authorizeButton.onclick = handleAuthClick;
	}
}

// Click handler for authorize-button. This will open a pop-up for the user to authorize the use of personal data.
// This will create the initial auth token and pass it to the callback handleAuthResult.
function handleAuthClick(event) {
	gapi.auth.authorize({client_id: clientId, scope: scopes, immediate: false}, handleAuthResult);
	return false;
}

// Make a call to the Google Calendar API and display the results via FullCalendar.
function makeApiCall(calendarId) {

	// Load the Google Calendar API.
	gapi.client.load('calendar', 'v3').then(function() {
	  // Create the request for the private calendar id.
		  var request = gapi.client.calendar.events.list({
				'calendarId': calendarId
			});

			// Receive and use the API response.
			request.then(function(resp) {
        var eventsList = [], successArgs, successRes;

				if (resp.result.error) {
					reportError('Google Calendar API: ' + data.error.message, data.error.errors);
				}
				else if (resp.result.items) {
					$.each(resp.result.items, function(i, entry) {

						eventsList.push({
							id: entry.id,
							title: entry.summary,
							start: entry.start.dateTime || entry.start.date, // Save the date/time start, with a fallback to date only.
							end: entry.end.dateTime || entry.end.date,
							url: entry.htmlLink,
							location: entry.location,
							description: entry.description
						});
					});

					// call the success handler(s) and allow it to return a new events array
					successArgs = [eventsList].concat(Array.prototype.slice.call(arguments, 1)); // Attach other jQuery success args.
					successRes = $.fullCalendar.applyAll(true, this, successArgs);
					if ($.isArray(successRes)) {
						return successRes;
					}
				}

				if(eventsList.length > 0) {
          generateFullCalendar(eventsList)
        }
        return eventsList;

		  }, function(reason) {
			console.log('Error: ' + reason.result.error.message);
		  });
	});
}

function generateFullCalendar(eventsList){
  $('#calendar').fullCalendar({
    googleCalendarApiKey: apiKey,
    events: eventsList
  });
}
