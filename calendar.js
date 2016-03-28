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
    this.$loading = $('.loading');

    this.initialize();
  };

  // Initialize GoogleCalendar.
  GoogleCalendar.prototype.initialize = function() {
    $(document).ready(function() {
      this.generateFullCalendar();
      this.initiateEvents();
    }.bind(this));
  };

  // One time initialization of FullCalendar element.
  GoogleCalendar.prototype.generateFullCalendar = function(eventsList) {
    this.$fullCalendar.fullCalendar({
      googleCalendarApiKey: this.apiKey,
      events: eventsList
    });
  };

  // Initiate GoogleCalendar events.
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

  // Remove current Google calendar from FullCalendar. Revoke the Google APIs
  // auth token via the request, and clean any existing structures of user data.
  function handleLogout(evt) {
    var request = $.ajax({
      url: 'https://accounts.google.com/o/oauth2/revoke?token='
        + root.gapi.auth.getToken().access_token,
      method: 'GET',
      dataType: 'jsonp',
    });
    request.done(function() {
      this.$fullCalendar.fullCalendar('removeEvents');
      this.elementDisplay('logout');
      root.localStorage.removeItem('calendarId');
      this.calendarId = '';
      this.eventsList = [];
    }.bind(this));
    request.fail(function() {
      this.$errorMsg.text('There was a logout error, please try again.');
      this.$errorMsg.show();
    }.bind(this));
  }


  // Render the calendar events that match the chosen month.
  function handleMonthChange(evt) {
    var monthEnd = Date.parse(this.$fullCalendar.fullCalendar('getView').end._d);
    var monthStart = Date.parse(this.$fullCalendar.fullCalendar('getView').start._d);
    var entryStart;

    this.$loading.show();
    this.$fullCalendar.fullCalendar('removeEvents');
    for (var i = 0; i < this.eventsList.length; i++) {
      entryStart = this.eventsList[i].startMs;
      if (entryStart <= monthEnd && entryStart >= monthStart) {
        this.$fullCalendar.fullCalendar('renderEvent', this.eventsList[i]);
      }
    }
    this.$loading.hide();
  }

  // Toggle the display of the authorization-form and logout-button depending on sessionStatus.
  GoogleCalendar.prototype.elementDisplay = function(sessionStatus) {
    if (sessionStatus === 'login') {
      this.$authForm.hide();
      this.$logoutBtn.show();
    } else {
      this.$authForm.show();
      this.$logoutBtn.hide();
    }
  };

  // Will be called by external handleClientLoad function upon Google APIs
  // JavaScript library load.
  GoogleCalendar.prototype.handleClientLoad = function() {
    root.gapi.client.setApiKey(this.apiKey);
    root.setTimeout(checkAuth.bind(this), 1);
  };

  // Check if user already authorized and refresh the auth token without generating
  // an auth pop-up. Callback handleAuthResult is called with the returned auth token.
  function checkAuth() {
    root.gapi.auth.authorize({
      client_id: this.clientId,
      scope: this.scopes,
      immediate: true
    }, handleAuthResult.bind(this));
  }

  // This will open a pop-up for the user to authorize the use of personal data.
  // This will create the initial auth token and pass it to the callback handleAuthResult.
  GoogleCalendar.prototype.handleAuthClick = function() {
    root.gapi.auth.authorize({
      client_id: this.clientId,
      scope: this.scopes,
      immediate: false
    }, handleAuthResult.bind(this));
  };

  // Handle success, or failure of the authorization.
  function handleAuthResult(authResult) {
    if (authResult && !authResult.error) {
      // Successful authorization: make the api call.
      this.elementDisplay('login');
      this.$errorMsg.hide();
      this.$loading.show();
      this.makeApiCall(this.calendarId);
    } else {
      // Failed authorization.
      this.$loading.hide();
      if (root.localStorage.getItem('calendarId')) {
        // If tried authorizing with new user input and failed show authorization error.
        this.$errorMsg.text('There was an issue with authorization, please try again.');
        this.$errorMsg.show();
      }
      this.elementDisplay('logout');
    }
  }

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

        if (resp.result.items) {
          $.each(resp.result.items, function(i, entry) {
            eventsList.push({
              title: entry.summary,
              // Save the date/time start, with a fallback to date only.
              start: entry.start.dateTime || entry.start.date,
              // Start in milliseconds.
              startMs: Date.parse(entry.start.dateTime),
              url: entry.htmlLink,
            });
          });
        }

        // Add click handlers for FullCalendar next, prev, and today buttons.
        $('.fc-next-button, .fc-prev-button, .fc-today-button').on(
          'click', handleMonthChange.bind(this)
         );
        this.eventsList = eventsList;
        (handleMonthChange.bind(this))();

      }.bind(this), function(reason) {
        this.$loading.hide();
        this.$errorMsg.text('This email was not authorized. Please login to the\
          account corresponding to the email.');
        this.$errorMsg.show();
        (handleLogout.bind(this))();
        console.log('Error: ' + reason.result.error.message);
      }.bind(this));

    }.bind(this));
  };

})(window);
