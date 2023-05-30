import angles from './angles.js';

if( /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent) ) 
  document.body.classList.add("mobile");  // If is mobile user, add mobile class to body.

// Start-up message fade timings
const message_div = document.getElementById("message");
setTimeout(() => {
  message_div.classList.add("fade-out");
  message_div.classList.remove("fade-in");

  setTimeout(() => {
    message_div.innerHTML = "Initialising...";
    message_div.classList.add("fade-in");
    message_div.classList.remove("fade-out");

    setTimeout(() => {
      message_div.classList.add("fade-out");
      message_div.classList.remove("fade-in");
    }, 600);
  }, 400);
}, 800);


/* Setup Angle Processor */
// Callback method updates GUI with results
const onResults = (results) => {
  for(let joint in results) {
    joint_cells[joint].setProgress( results[joint] );
  }
}
// Create new angle processor, provide the callback, and the size of the noise filter buffer (running median).
const AnglesProcessor = new angles.JointsProcessor(onResults, 4);


/* Initialise GUI */
const grid = document.getElementById("grid-space");
const cell_tmplt = document.getElementById("cell-template");
const joint_cells = {};

const FADE_IN_TIMES = {
  "MJ2": 4800+100,
  "MJ1": 4800+200,
  "IJ2": 4800+200,
  "RJ2": 4800+200,
  "MJ3": 4800+200,
  "IJ1": 4800+300,
  "TJ2": 4800+300,
  "IJ3": 4800+300,
  "RJ3": 4800+300,
  "PJ2": 4800+300,
  "RJ1": 4800+300,
  "TJ1": 4800+400,
  "TJ3": 4800+400,
  "PJ3": 4800+400,
  "PJ1": 4800+400
};

// Create elements from template for each joint, and connect with callback for updating progress bar value.
for(let joint in angles.JOINTS) {
  joint_cells[joint] = { cell: document.importNode(cell_tmplt.content, true).querySelectorAll(".cell")[0] };
  joint_cells[joint].circle = joint_cells[joint].cell.querySelector('circle');
  joint_cells[joint].radius = joint_cells[joint].circle.r.baseVal.value;
  joint_cells[joint].circumference = joint_cells[joint].radius * 2 * Math.PI;
  joint_cells[joint].text = joint_cells[joint].cell.querySelectorAll('.prog-text')[0];
  joint_cells[joint].title = joint_cells[joint].cell.querySelectorAll('.cell-title')[0];
  joint_cells[joint].setProgress = function(degrees) {
    this.circle.style.strokeDashoffset = this.circumference - (degrees/360) * this.circumference;
    this.text.innerHTML = `${degrees}°`;
  }

  joint_cells[joint].circle.style.strokeDasharray = `${joint_cells[joint].circumference} ${joint_cells[joint].circumference}`;
  joint_cells[joint].circle.style.strokeDashoffset = `${joint_cells[joint].circumference}`;
    
  joint_cells[joint].title.innerHTML = angles.JOINTS[joint].text;

  // Initialise high and animate low. Visual sugar only - not necessary.
  joint_cells[joint].setProgress(275);
  setTimeout(() => joint_cells[joint].setProgress(0), 5600);

  joint_cells[joint].cell.classList.add("cell-fade-in");
  joint_cells[joint].cell.style.animationDelay = `${FADE_IN_TIMES[joint]}ms`;

  grid.appendChild(joint_cells[joint].cell);
}