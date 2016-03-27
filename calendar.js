// This function will be called once the Google APIs JavaScript client library loads.
function handleClientLoad() {
  var clientId = '78512710474-gmldkv4v754u7phqgk5cj5c7a5pqrq5v.apps.googleusercontent.com';
  var apiKey = 'AIzaSyChbqdw1gU-hpEvqKLORMf79jSZ15DM-bM';
  var gCalApiVersion = 'v3';
  var newCal = new FullCalendar.GoogleCalendar(clientId, apiKey, gCalApiVersion);
  newCal.handleClientLoad();
}

(function(root) {
  var FullCalendar = root.FullCalendar = root.FullCalendar || {};

  var GoogleCalendar = FullCalendar.GoogleCalendar = function(clientId, apiKey, gCalApiVersion) {
    this.clientId = clientId;
    this.apiKey = apiKey;
    this.gCalApiVersion = gCalApiVersion;  //The Google Calendar API version.
    this.scopes = 'https://www.googleapis.com/auth/calendar';
    this.calendarId = root.localStorage.getItem('calendarId');

    this.$fullCalendar = $('#full-calendar');
    this.$authBtn = $('#authorize-button');
    this.$logoutBtn = $('.logout-button');
    this.$errorMsg = $('.error-msg');
    this.$authForm = $('.authorize-form');
    this.$calendarId = $('#calendar-id');

    this.initialize();
  };

  GoogleCalendar.prototype.initialize = function() {
    $(document).ready(function() {
      this.generateFullCalendar();
      this.initiateEvents();
    }.bind(this));
  };

  GoogleCalendar.prototype.generateFullCalendar = function() {
    this.$fullCalendar.fullCalendar({
      googleCalendarApiKey: this.apiKey,
    });
  };

  GoogleCalendar.prototype.initiateEvents = function() {
    this.$authBtn.on('click', handleAddCalendar.bind(this));
    this.$logoutBtn.on('click', handleLogout.bind(this));
  };

  // Click handler for #authorize-button. Validates the gmail address input and calls
  // authorize function, or displays error.
  function handleAddCalendar(evt) {
    this.calendarId = this.$calendarId.val();
    if (/^[a-z0-9](\.?[a-z0-9]){5,}@g(oogle)?mail\.com$/i.test(this.calendarId)) {
      root.localStorage.setItem('calendarId', this.calendarId);
      this.handleAuthClick();
    } else {
      this.$errorMsg.text('Please verify email address.');
      this.$errorMsg.show();
    }
  }

  function handleLogout(evt) {
    var request = $.ajax({
      url: 'https://accounts.google.com/o/oauth2/revoke?token=' + root.gapi.auth.getToken().access_token,
      method: 'GET',
      dataType: 'jsonp',
      crossDomain: true
    });
    request.done(function() {
      this.$fullCalendar.fullCalendar('removeEvents');
      this.elementDisplay('logout');
      root.localStorage.removeItem('calendarId');
      this.calendarId = '';
    }.bind(this));
    request.fail(function() {
      this.$errorMsg.text('There was a logout error, please try again.');
      this.$errorMsg.show();
    }.bind(this));
  }

  GoogleCalendar.prototype.elementDisplay = function(sessionStatus) {
    if (sessionStatus === 'login') {
      this.$authForm.hide();
      this.$logoutBtn.show();
    } else {
      this.$authForm.show();
      this.$logoutBtn.hide();
    }
  };

  GoogleCalendar.prototype.handleClientLoad = function() {
    root.gapi.client.setApiKey(this.apiKey);
    root.setTimeout(checkAuth.bind(this), 1);
  };

  // Check if user already authorized and refresh the auth token without generating an auth pop-up.
  // Callback handleAuthResult is called with the returned auth token.
  function checkAuth() {
    root.gapi.auth.authorize({client_id: this.clientId, scope: this.scopes, immediate: true}, handleAuthResult.bind(this));
  }

  // Handle success, or failure of the authorization.
  function handleAuthResult(authResult) {
    // Successful authorization: hide the authorize-form and make the api call.
    if (authResult && !authResult.error) {
      this.elementDisplay('login');
      this.makeApiCall(this.calendarId);
    // Failed authorization: show the authorize-form and set the form button's click handler.
    } else {
      // If tried authorizing with new user input and failed show authorization error.
      if (root.localStorage.getItem('calendarId')) {
        this.$errorMsg.text('There was an issue with authorization, please try again.');
        this.$errorMsg.show();
      }
      this.elementDisplay('logout');
    }
  }

  // This will open a pop-up for the user to authorize the use of personal data.
  // This will create the initial auth token and pass it to the callback handleAuthResult.
  GoogleCalendar.prototype.handleAuthClick = function() {
    root.gapi.auth.authorize({client_id: this.clientId, scope: this.scopes, immediate: false}, handleAuthResult.bind(this));
    return false;
  };

  // Make a call to the Google Calendar API and display the results via FullCalendar.
  GoogleCalendar.prototype.makeApiCall = function() {

    // Load the Google Calendar API.
    root.gapi.client.load('calendar', this.gCalApiVersion).then(function() {
      // Create the request for the private calendar id.
      var request = root.gapi.client.calendar.events.list({
        'calendarId': this.calendarId
      });

      // Receive and use the API response.
      request.then(function(resp) {
        var eventsList = [];

        if (resp.result.error) {
          reportError('Google Calendar API: ' + data.error.message, data.error.errors);
        }
        else if (resp.result.items) {
          $.each(resp.result.items, function(i, entry) {
            eventsList.push({
              title: entry.summary,
              start: entry.start.dateTime || entry.start.date, // Save the date/time start, with a fallback to date only.
              url: entry.htmlLink,
            });
          });
        }

        for (var i = 0; i < eventsList.length; i++) {
          this.$fullCalendar.fullCalendar('renderEvent', eventsList[i]);
        }
        return eventsList;

      }.bind(this), function(reason) {
        console.log('Error: ' + reason.result.error.message);
      });
    }.bind(this));
  };

})(window);
