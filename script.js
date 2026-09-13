"use strict";

const config = window.WEDDING_CONFIG || {};
const ceremonyTime = new Date(config.ceremonyDate).getTime();
const countdownNodes = ["days", "hours", "minutes", "seconds"].map(id => document.getElementById(id));
let countdownInterval;
function updateCountdown() {
  if (!Number.isFinite(ceremonyTime)) return;
  const remaining = Math.max(0, Math.floor((ceremonyTime - Date.now()) / 1000));
  const parts = [Math.floor(remaining / 86400), Math.floor(remaining / 3600) % 24, Math.floor(remaining / 60) % 60, remaining % 60];
  countdownNodes.forEach((node, index) => { node.textContent = String(parts[index]).padStart(2, "0"); });
  if (remaining === 0) {
    document.getElementById("countdown-caption").textContent = "Ngày hạnh phúc đã đến. Cảm ơn bạn đã chung vui!";
    clearInterval(countdownInterval);
  }
}
countdownInterval = setInterval(updateCountdown, 1000);
updateCountdown();

// Cá nhân hóa đường dẫn: ?to=Gia%20đình%20bạn%20Minh
const guestName = new URLSearchParams(window.location.search).get("to")?.trim().slice(0, 120);
if (guestName) {
  const guestNode = document.getElementById("guest-name");
  guestNode.textContent = guestName;
  guestNode.hidden = false;
}

const photoDialog = document.getElementById("photo-dialog");
const giftDialog = document.getElementById("gift-dialog");
const photos = Array.from(document.querySelectorAll("[data-photo]"));
let selectedPhoto = 0;
let previousFocus;

function openDialog(dialog) {
  previousFocus = document.activeElement;
  dialog.showModal();
  document.body.classList.add("modal-open");
}
function showPhoto(index) {
  selectedPhoto = (index + photos.length) % photos.length;
  const button = photos[selectedPhoto];
  const image = document.getElementById("large-photo");
  image.src = button.dataset.photo;
  image.alt = button.querySelector("img").alt;
  document.getElementById("photo-counter").textContent = `${selectedPhoto + 1} / ${photos.length}`;
}
photos.forEach((button, index) => button.addEventListener("click", () => {
  showPhoto(index);
  openDialog(photoDialog);
}));
document.querySelector(".photo-prev").addEventListener("click", () => showPhoto(selectedPhoto - 1));
document.querySelector(".photo-next").addEventListener("click", () => showPhoto(selectedPhoto + 1));
photoDialog.addEventListener("keydown", event => {
  if (event.key === "ArrowLeft" || event.key === "ArrowRight") {
    event.preventDefault();
    showPhoto(selectedPhoto + (event.key === "ArrowLeft" ? -1 : 1));
  }
});
[photoDialog, giftDialog].forEach(dialog => {
  dialog.querySelector("[data-close]").addEventListener("click", () => dialog.close());
  dialog.addEventListener("click", event => {
    if (event.target !== dialog) return;
    const bounds = dialog.getBoundingClientRect();
    if (dialog === photoDialog || event.clientX < bounds.left || event.clientX > bounds.right || event.clientY < bounds.top || event.clientY > bounds.bottom) dialog.close();
  });
  dialog.addEventListener("close", () => {
    document.body.classList.remove("modal-open");
    previousFocus?.focus();
  });
});

// Chỉ hiển thị nút mừng cưới sau khi ảnh QR thật tải thành công.
if (config.giftQrSrc) {
  const qrImage = document.getElementById("gift-qr");
  qrImage.addEventListener("load", () => {
    document.getElementById("open-gift").hidden = false;
    document.getElementById("download-qr").href = config.giftQrSrc;
  }, { once: true });
  qrImage.src = config.giftQrSrc;
}
document.getElementById("open-gift").addEventListener("click", () => openDialog(giftDialog));
