const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);

const list = document.getElementById("project-box-list");
if(isMobile) list.classList.add("mobile");