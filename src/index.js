import $ from "./jquery";

/*
## Demo usage
- Try pressing record, clicking around, press record again and then click play. 
- Play creates an `<iframe>`, injects the original HTML and replays the user events. 
- To change zoom change the `REPLAY_SCALE` variable in the source code. 
- To change the playback speed change the `SPEED` variable in the source code.
- NB I only tested the jsbin on chrome 56.
*/

console.log("load");

console.log("loaded");
$(function() {
  // config
  const REPLAY_SCALE = 0.631;
  const SPEED = 1;

  // init elements
  const $play = $("#play");
  const $record = $("#record");
  const $body = $("body");
  $play.attr("disabled", 1);

  // Data type for storing a recording
  const recording = { events: [], startTime: -1, htmlCopy: "" };

  // Record each type of event
  const handlers = [
    {
      eventName: "mousemove",
      handler: function handleMouseMove(e) {
        recording.events.push({
          type: "mousemove",
          x: e.pageX,
          y: e.pageY,
          time: Date.now()
        });
      }
    },
    {
      eventName: "click",
      handler: function handleClick(e) {
        recording.events.push({
          type: "click",
          target: e.target,
          x: e.pageX,
          y: e.pageY,
          time: Date.now()
        });
      }
    },
    {
      eventName: "keypress",
      handler: function handleKeyPress(e) {
        recording.events.push({
          type: "keypress",
          target: e.target,
          value: e.target.value,
          keyCode: e.keyCode,
          time: Date.now()
        });
      }
    }
  ];

  // Attach recording button
  $record.toggle(
    function startRecording() {
      // start recording
      $record.text("Recording (Click again to Stop)");
      $play.attr("disabled", 1);
      recording.startTime = Date.now();
      recording.events = [];
      recording.htmlCopy = $(document.documentElement).html();
      recording.height = $(window).height();
      recording.width = $(window).width();
      handlers.map(x => listen(x.eventName, x.handler));
    },
    function stopRecording() {
      // stop recording
      $record.text("Record");
      $play.removeAttr("disabled");
      handlers.map(x => removeListener(x.eventName, x.handler));
    }
  );

  // Replay
  $play.click(function() {
    // init iframe set scale
    const $iframe = $("<iframe>");
    $iframe.height(recording.height * REPLAY_SCALE);
    $iframe.width(recording.width * REPLAY_SCALE);
    $iframe.css({
      "-ms-zoom": `${REPLAY_SCALE}`,
      "-moz-transform": `scale(${REPLAY_SCALE})`,
      "-moz-transform-origin": `0 0`,
      "-o-transform": `scale(${REPLAY_SCALE})`,
      "-o-transform-origin": `0 0`,
      "-webkit-transform": `scale(${REPLAY_SCALE})`,
      "-webkit-transform-origin": `0 0`
    });
    $body.append($iframe);

    // Load HTML
    $iframe[0].contentDocument.documentElement.innerHTML = recording.htmlCopy;
    const $iframeDoc = $($iframe[0].contentDocument.documentElement);

    // Insert fake cursor
    const $fakeCursor = $('<div class="cursor"></div>');
    $iframeDoc.find("body").append($fakeCursor);

    let i = 0;
    const startPlay = Date.now();

    (function draw() {
      let event = recording.events[i];
      if (!event) {
        return;
      }
      let offsetRecording = event.time - recording.startTime;
      let offsetPlay = (Date.now() - startPlay) * SPEED;
      if (offsetPlay >= offsetRecording) {
        drawEvent(event, $fakeCursor, $iframeDoc);
        i++;
      }

      if (i < recording.events.length) {
        requestAnimationFrame(draw);
      } else {
        $iframe.remove();
      }
    })();
  });

  function drawEvent(event, $fakeCursor, $iframeDoc) {
    if (event.type === "click" || event.type === "mousemove") {
      $fakeCursor.css({
        top: event.y,
        left: event.x
      });
    }

    if (event.type === "click") {
      flashClass($fakeCursor, "click");
      const path = $(event.target).getPath();
      const $element = $iframeDoc.find(path);
      flashClass($element, "clicked");
    }

    if (event.type === "keypress") {
      const path = $(event.target).getPath();
      const $element = $iframeDoc.find(path);
      $element.trigger({ type: "keypress", keyCode: event.keyCode });
      $element.val(event.value);
    }
  }

  // Helpers

  function listen(eventName, handler) {
    // listens even if stopPropagation
    return document.documentElement.addEventListener(eventName, handler, true);
  }

  function removeListener(eventName, handler) {
    // removes listen even if stopPropagation
    return document.documentElement.removeEventListener(
      eventName,
      handler,
      true
    );
  }

  function flashClass($el, className) {
    $el
      .addClass(className)
      .delay(200)
      .queue(() => $el.removeClass(className).dequeue());
  }
});
