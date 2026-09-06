import "./style.css";
import { supabase } from "./supabase.js";

const form = document.getElementById("surveyForm");
const submitBtn = document.getElementById("submitBtn");
const successOverlay = document.getElementById("successOverlay");
const storyInput = document.getElementById("story");
const storyCount = document.getElementById("storyCount");
const collectDateInput = document.getElementById("collectDate");
const streetCodeInput = document.getElementById("streetCode");
const buildingNameInput = document.getElementById("buildingName");
const autoTitleText = document.getElementById("autoTitleText");

function todayISODate() {
  const now = new Date();
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, "0");
  const d = String(now.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

function toYYMMDD(isoDate) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(isoDate)) return "";
  return isoDate.slice(2, 4) + isoDate.slice(5, 7) + isoDate.slice(8, 10);
}

function buildAutoTitle() {
  const parts = [];
  const yymmdd = toYYMMDD(collectDateInput.value.trim());
  if (yymmdd) parts.push(yymmdd);

  const streetCode = streetCodeInput.value.trim();
  if (streetCode) parts.push(streetCode);

  const buildingName = buildingNameInput.value.trim();
  if (buildingName) parts.push(buildingName);

  const photoContent = Array.from(
    form.querySelectorAll('input[name="photoContent"]:checked')
  ).map((el) => el.value);
  if (photoContent.length > 0) parts.push(photoContent.join("/"));

  return parts.join("-") || "—";
}

function updateAutoTitle() {
  autoTitleText.textContent = buildAutoTitle();
}

collectDateInput.value = todayISODate();
updateAutoTitle();

[collectDateInput, streetCodeInput, buildingNameInput].forEach((el) => {
  el.addEventListener("input", updateAutoTitle);
  el.addEventListener("change", updateAutoTitle);
});

form.querySelectorAll('input[name="photoContent"]').forEach((el) => {
  el.addEventListener("change", updateAutoTitle);
});

storyInput.addEventListener("input", () => {
  storyCount.textContent = String(storyInput.value.length);
});

document.querySelectorAll(".photo-input").forEach((input) => {
  input.addEventListener("change", () => {
    const tile = document.getElementById(input.dataset.tile);
    if (!tile) return;
    const inner = tile.querySelector(".ptile-inner");

    if (tile.dataset.previewUrl) {
      URL.revokeObjectURL(tile.dataset.previewUrl);
      delete tile.dataset.previewUrl;
    }

    if (input.files && input.files[0]) {
      const url = URL.createObjectURL(input.files[0]);
      tile.dataset.previewUrl = url;
      tile.classList.add("filled");
      inner.innerHTML = `<img class="ptile-thumb" src="${url}" alt="预览" />`;
    } else {
      tile.classList.remove("filled");
      const isMust = tile.classList.contains("must");
      inner.innerHTML = isMust
        ? `<span class="plus">＋</span><span class="ptile-label">完整立面<br />必传</span>`
        : `<span class="plus">＋</span><span class="ptile-label">局部特写<br />选填</span>`;
    }
  });
});

function getPhotoFiles() {
  const facade = form.querySelector('input[name="photoFacade"]').files?.[0] || null;
  const detail1 = form.querySelector('input[name="photoDetail1"]').files?.[0] || null;
  const detail2 = form.querySelector('input[name="photoDetail2"]').files?.[0] || null;
  return { facade, detail1, detail2 };
}

function getFormData() {
  const formData = new FormData(form);
  const photos = getPhotoFiles();
  return {
    wechatId: (formData.get("wechatId") || "").trim(),
    gender: formData.get("gender") || "",
    ageRange: formData.get("ageRange") || "",
    region: formData.get("region") || "",
    phone: (formData.get("phone") || "").trim(),
    collectDate: (formData.get("collectDate") || "").trim(),
    streetCode: (formData.get("streetCode") || "").trim(),
    buildingName: (formData.get("buildingName") || "").trim(),
    photoContent: formData.getAll("photoContent"),
    story: (formData.get("story") || "").trim(),
    agree: formData.get("agree") === "on",
    photos,
  };
}

function isValidCollectDate(value) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const [y, m, d] = value.split("-").map(Number);
  const date = new Date(y, m - 1, d);
  return date.getFullYear() === y && date.getMonth() === m - 1 && date.getDate() === d;
}

function isValidPhone(phone) {
  const cleaned = phone.replace(/[\s-]/g, "");
  // 内地手机：可选 +86 / 86 前缀
  if (/^(\+?86)?1[3-9]\d{9}$/.test(cleaned)) return true;
  // 固话：区号 + 号码（7–8 位）
  if (/^0\d{2,3}\d{7,8}$/.test(cleaned)) return true;
  return false;
}

function validate(data) {
  const errors = {};
  if (!data.gender) errors.gender = "请选择您的性别";
  if (!data.ageRange) errors.ageRange = "请选择您的年龄段";
  if (!data.region) errors.region = "请选择您熟悉的语言文化地区";
  if (!data.phone) errors.phone = "请输入您的联系电话";
  else if (!isValidPhone(data.phone))
    errors.phone = "请输入有效的手机号或固话（如 13800138000）";
  if (!data.wechatId) errors.wechatId = "请输入微信 ID";
  if (!data.collectDate) errors.collectDate = "请选择采集日期";
  else if (!isValidCollectDate(data.collectDate))
    errors.collectDate = "请选择有效的采集日期";
  if (!data.photos.facade) errors.photos = "请上传至少一张完整立面照片";
  if (!data.story) errors.story = "请填写故事线索";
  if (!data.agree) errors.agree = "请勾选原创与授权确认";
  return errors;
}

function showErrors(errors) {
  document.querySelectorAll(".error-msg").forEach((el) => {
    el.textContent = "";
  });
  for (const [field, msg] of Object.entries(errors)) {
    const el = document.querySelector(`.error-msg[data-field="${field}"]`);
    if (el) el.textContent = msg;
  }
}

function resetPhotoTiles() {
  document.querySelectorAll(".ptile").forEach((tile) => {
    if (tile.dataset.previewUrl) {
      URL.revokeObjectURL(tile.dataset.previewUrl);
      delete tile.dataset.previewUrl;
    }
    tile.classList.remove("filled");
    const inner = tile.querySelector(".ptile-inner");
    const isMust = tile.classList.contains("must");
    inner.innerHTML = isMust
      ? `<span class="plus">＋</span><span class="ptile-label">完整立面<br />必传</span>`
      : `<span class="plus">＋</span><span class="ptile-label">局部特写<br />选填</span>`;
  });
}

const PHOTO_BUCKET = "liwan-photo";
const EVENT_ID = "liwan_building";

function safeFileName(name) {
  return name.replace(/[^\w.\u4e00-\u9fff-]+/g, "_").slice(0, 80) || "photo.jpg";
}

async function uploadPhoto(file, role, collectDate) {
  const yymmdd = toYYMMDD(collectDate) || "unknown";
  const stamp = Date.now();
  const path = `${EVENT_ID}/${yymmdd}/${stamp}-${role}-${safeFileName(file.name)}`;

  const { error } = await supabase.storage.from(PHOTO_BUCKET).upload(path, file, {
    cacheControl: "3600",
    upsert: false,
    contentType: file.type || "image/jpeg",
  });
  if (error) throw error;

  const { data } = supabase.storage.from(PHOTO_BUCKET).getPublicUrl(path);
  return {
    role,
    name: file.name,
    size: file.size,
    type: file.type,
    path,
    url: data.publicUrl,
  };
}

async function uploadAllPhotos(photos, collectDate) {
  const jobs = [];
  if (photos.facade) jobs.push(uploadPhoto(photos.facade, "facade", collectDate));
  if (photos.detail1) jobs.push(uploadPhoto(photos.detail1, "detail1", collectDate));
  if (photos.detail2) jobs.push(uploadPhoto(photos.detail2, "detail2", collectDate));
  return Promise.all(jobs);
}

async function handleSubmit(e) {
  e.preventDefault();

  const data = getFormData();
  const errors = validate(data);
  showErrors(errors);
  if (Object.keys(errors).length > 0) return;

  submitBtn.disabled = true;
  submitBtn.textContent = "上传图片中...";

  let uploadedPhotos;
  try {
    uploadedPhotos = await uploadAllPhotos(data.photos, data.collectDate);
  } catch (err) {
    submitBtn.disabled = false;
    submitBtn.textContent = "提交问卷";
    alert("图片上传失败，请稍后重试：" + (err.message || err));
    return;
  }

  submitBtn.textContent = "提交中...";

  const content = {
    campaign: "荔湾历史建筑文化信息征集",
    gender: data.gender,
    ageRange: data.ageRange,
    region: data.region,
    phone: data.phone,
    collectDate: data.collectDate,
    collectDateYYMMDD: toYYMMDD(data.collectDate),
    streetCode: data.streetCode || null,
    buildingName: data.buildingName || null,
    autoTitle: buildAutoTitle(),
    photoContent: data.photoContent,
    photoFiles: uploadedPhotos,
    story: data.story,
    mediaType: "图片",
  };

  const { error } = await supabase.from("app_lib_h5_survey").insert({
    wechat_id: data.wechatId,
    event_id: EVENT_ID,
    content,
  });

  submitBtn.disabled = false;
  submitBtn.textContent = "提交问卷";

  if (error) {
    alert("提交失败，请稍后重试：" + error.message);
    return;
  }

  successOverlay.classList.add("show");
  form.reset();
  collectDateInput.value = todayISODate();
  storyCount.textContent = "0";
  resetPhotoTiles();
  updateAutoTitle();
}

form.addEventListener("submit", handleSubmit);
