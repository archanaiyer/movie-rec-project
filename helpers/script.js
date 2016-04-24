var tag = createElement('script');
tag.src = "http://www.youtube.com/iframe_api";
var firstScriptTag = document.getElementsByTagName('script')[0];
firstScriptTag.parentNode.insertBefore(tag, firstScriptTag);

// This code is called by the YouTube API to create the player object
function onYouTubeIframeAPIReady(event) {
  player = new YT.Player('youTubePlayer', {
    events: {
      'onReady': onPlayerReady,
      'onStateChange': onPlayerStateChange
    }
  });
}

var pauseFlag = false;
function onPlayerReady(event) {
   // do nothing, no tracking needed
}
function onPlayerStateChange(event) {
    // track when user clicks to Play
    if (event.data == YT.PlayerState.PLAYING) {
        _gaq.push(['_trackEvent', 'Videos', 'Play', 'Test Video']);
        pauseFlag = true;
    }
    // track when user clicks to Pause
    if (event.data == YT.PlayerState.PAUSED && pauseFlag) {
        _gaq.push(['_trackEvent', 'Videos', 'Pause', 'Test Video']);
        pauseFlag = false;
    }
    // track when video ends
    if (event.data == YT.PlayerState.ENDED) {
        _gaq.push(['_trackEvent', 'Videos', 'Finished', 'Test Video']);
    }
}
