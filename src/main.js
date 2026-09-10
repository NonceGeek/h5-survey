import "./style.css";
import { supabase } from "./supabase.js";

const PHOTO_BUCKET = "liwan-photo";
const EVENT_ID = "liwan_building";
const BASIC_INFO_KEY = "liwan_building_basic_info";
const PHOTO_ROLES = ["facade", "detail1", "detail2"];
const PHOTO_CONTENT_NAMES = {
  facade: "photoContentFacade",
  detail1: "photoContentDetail1",
  detail2: "photoContentDetail2",
};
const PHOTO_FILE_NAMES = {
  facade: "photoFacade",
  detail1: "photoDetail1",
  detail2: "photoDetail2",
};
const PHOTO_EMPTY_LABEL = {
  facade: `<span class="plus">＋</span><span class="ptile-label">点击上传<br />必传</span>`,
  detail1: `<span class="plus">＋</span><span class="ptile-label">点击上传<br />选填</span>`,
  detail2: `<span class="plus">＋</span><span class="ptile-label">点击上传<br />选填</span>`,
};

const form = document.getElementById("surveyForm");
const submitBtn = document.getElementById("submitBtn");
const successOverlay = document.getElementById("successOverlay");
const storyInput = document.getElementById("story");
const storyCount = document.getElementById("storyCount");
const collectDateInput = document.getElementById("collectDate");
const streetCodeInput = document.getElementById("streetCode");
const buildingNameInput = document.getElementById("buildingName");
const regionOtherRadio = document.getElementById("regionOtherRadio");
const regionOtherInput = document.getElementById("regionOtherInput");

function syncRegionOtherInput() {
  if (!regionOtherRadio.checked) {
    regionOtherInput.value = "";
  }
}

form.querySelectorAll('input[name="region"]').forEach((el) => {
  el.addEventListener("change", syncRegionOtherInput);
});

regionOtherInput.addEventListener("pointerdown", (e) => {
  e.stopPropagation();
});

regionOtherInput.addEventListener("focus", () => {
  regionOtherRadio.checked = true;
});

regionOtherInput.addEventListener("input", () => {
  regionOtherRadio.checked = true;
});

function getBasicInfoFromForm() {
  const formData = new FormData(form);
  let region = formData.get("region") || "";
  let regionOther = (formData.get("regionOther") || "").trim();
  if (region === "其他" && regionOther) {
    region = `其他（${regionOther}）`;
  }
  return {
    gender: formData.get("gender") || "",
    ageRange: formData.get("ageRange") || "",
    region,
    regionOther: region.startsWith("其他") ? regionOther : "",
    phone: (formData.get("phone") || "").trim(),
    email: (formData.get("email") || "").trim(),
  };
}

function saveBasicInfo() {
  try {
    const info = getBasicInfoFromForm();
    const hasAny =
      info.gender || info.ageRange || info.region || info.phone || info.email;
    if (!hasAny) return;
    localStorage.setItem(BASIC_INFO_KEY, JSON.stringify(info));
  } catch {
    // ignore quota / private mode errors
  }
}

function applyBasicInfo(info) {
  if (!info) return;

  if (info.gender) {
    const el = form.querySelector(`input[name="gender"][value="${CSS.escape(info.gender)}"]`);
    if (el) el.checked = true;
  }

  if (info.ageRange) {
    const el = form.querySelector(
      `input[name="ageRange"][value="${CSS.escape(info.ageRange)}"]`
    );
    if (el) el.checked = true;
  }

  if (info.region) {
    const otherMatch = info.region.match(/^其他（(.+)）$/);
    if (info.region === "其他" || otherMatch) {
      regionOtherRadio.checked = true;
      regionOtherInput.value = otherMatch
        ? otherMatch[1]
        : info.regionOther || "";
    } else {
      const el = form.querySelector(
        `input[name="region"][value="${CSS.escape(info.region)}"]`
      );
      if (el) el.checked = true;
      regionOtherInput.value = "";
    }
  }

  if (info.phone) {
    const phoneInput = form.querySelector('input[name="phone"]');
    if (phoneInput) phoneInput.value = info.phone;
  }

  if (info.email) {
    const emailInput = form.querySelector('input[name="email"]');
    if (emailInput) emailInput.value = info.email;
  }
}

function loadBasicInfo() {
  try {
    const raw = localStorage.getItem(BASIC_INFO_KEY);
    if (!raw) return;
    applyBasicInfo(JSON.parse(raw));
  } catch {
    // ignore parse / storage errors
  }
}

function bindBasicInfoAutosave() {
  const fields = form.querySelectorAll(
    'input[name="gender"], input[name="ageRange"], input[name="region"], input[name="regionOther"], input[name="phone"], input[name="email"]'
  );
  fields.forEach((el) => {
    el.addEventListener("change", saveBasicInfo);
    el.addEventListener("input", saveBasicInfo);
  });
}

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

function getPhotoContent(role) {
  const name = PHOTO_CONTENT_NAMES[role];
  return Array.from(form.querySelectorAll(`input[name="${name}"]:checked`)).map(
    (el) => el.value
  );
}

function buildPhotoTitle(role) {
  const parts = [];
  const yymmdd = toYYMMDD(collectDateInput.value.trim());
  if (yymmdd) parts.push(yymmdd);

  const streetCode = streetCodeInput.value.trim();
  if (streetCode) parts.push(streetCode);

  const buildingName = buildingNameInput.value.trim();
  if (buildingName) parts.push(buildingName);

  const photoContent = getPhotoContent(role);
  if (photoContent.length > 0) parts.push(photoContent.join("/"));

  return parts.join("-") || "—";
}

function updateAllPhotoTitles() {
  PHOTO_ROLES.forEach((role) => {
    const el = document.querySelector(`[data-photo-title="${role}"]`);
    if (el) el.textContent = buildPhotoTitle(role);
  });
}

collectDateInput.value = todayISODate();
loadBasicInfo();
bindBasicInfoAutosave();
updateAllPhotoTitles();

[collectDateInput, streetCodeInput, buildingNameInput].forEach((el) => {
  el.addEventListener("input", updateAllPhotoTitles);
  el.addEventListener("change", updateAllPhotoTitles);
});

PHOTO_ROLES.forEach((role) => {
  form.querySelectorAll(`input[name="${PHOTO_CONTENT_NAMES[role]}"]`).forEach((el) => {
    el.addEventListener("change", updateAllPhotoTitles);
  });
});

storyInput.addEventListener("input", () => {
  storyCount.textContent = String(storyInput.value.length);
});

document.querySelectorAll(".photo-input").forEach((input) => {
  input.addEventListener("change", () => {
    const tile = document.getElementById(input.dataset.tile);
    if (!tile) return;
    const inner = tile.querySelector(".ptile-inner");
    const role = input.dataset.photo;

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
      inner.innerHTML = PHOTO_EMPTY_LABEL[role] || PHOTO_EMPTY_LABEL.detail1;
    }
  });
});

function getPhotoFiles() {
  return {
    facade: form.querySelector(`input[name="${PHOTO_FILE_NAMES.facade}"]`).files?.[0] || null,
    detail1: form.querySelector(`input[name="${PHOTO_FILE_NAMES.detail1}"]`).files?.[0] || null,
    detail2: form.querySelector(`input[name="${PHOTO_FILE_NAMES.detail2}"]`).files?.[0] || null,
  };
}

function getFormData() {
  const formData = new FormData(form);
  const photos = getPhotoFiles();
  let region = formData.get("region") || "";
  if (region === "其他") {
    const other = (formData.get("regionOther") || "").trim();
    region = other ? `其他（${other}）` : "其他";
  }
  return {
    gender: formData.get("gender") || "",
    ageRange: formData.get("ageRange") || "",
    region,
    phone: (formData.get("phone") || "").trim(),
    email: (formData.get("email") || "").trim(),
    collectDate: (formData.get("collectDate") || "").trim(),
    streetCode: (formData.get("streetCode") || "").trim(),
    buildingName: (formData.get("buildingName") || "").trim(),
    photoContents: {
      facade: getPhotoContent("facade"),
      detail1: getPhotoContent("detail1"),
      detail2: getPhotoContent("detail2"),
    },
    photoTitles: {
      facade: buildPhotoTitle("facade"),
      detail1: buildPhotoTitle("detail1"),
      detail2: buildPhotoTitle("detail2"),
    },
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
  if (/^(\+?86)?1[3-9]\d{9}$/.test(cleaned)) return true;
  if (/^0\d{2,3}\d{7,8}$/.test(cleaned)) return true;
  return false;
}

function isValidEmail(email) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

function validate(data) {
  const errors = {};
  if (!data.gender) errors.gender = "请选择您的性别";
  if (!data.ageRange) errors.ageRange = "请选择您的年龄段";
  if (!data.region) errors.region = "请选择您熟悉的语言文化地区";
  else if (data.region === "其他") errors.region = "请填写具体地区";
  if (!data.phone) errors.phone = "请输入您的联系电话";
  else if (!isValidPhone(data.phone))
    errors.phone = "请输入有效的手机号或固话（如 13800138000）";
  if (data.email && !isValidEmail(data.email))
    errors.email = "请输入有效的 Email 地址";
  if (!data.collectDate) errors.collectDate = "请选择采集日期";
  else if (!isValidCollectDate(data.collectDate))
    errors.collectDate = "请选择有效的采集日期";
  if (!data.photos.facade) errors.photos = "请上传照片 1";
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
  PHOTO_ROLES.forEach((role) => {
    const tileId =
      role === "facade" ? "tileFacade" : role === "detail1" ? "tileDetail1" : "tileDetail2";
    const tile = document.getElementById(tileId);
    if (!tile) return;
    if (tile.dataset.previewUrl) {
      URL.revokeObjectURL(tile.dataset.previewUrl);
      delete tile.dataset.previewUrl;
    }
    tile.classList.remove("filled");
    tile.querySelector(".ptile-inner").innerHTML = PHOTO_EMPTY_LABEL[role];
  });
}

function safeFileName(name) {
  return name.replace(/[^\w.\u4e00-\u9fff-]+/g, "_").slice(0, 80) || "photo.jpg";
}

async function uploadPhoto(file, role, collectDate, autoTitle) {
  const yymmdd = toYYMMDD(collectDate) || "unknown";
  const stamp = Date.now();
  const titleSlug = autoTitle && autoTitle !== "—"
    ? safeFileName(autoTitle)
    : role;
  const path = `${EVENT_ID}/${yymmdd}/${stamp}-${titleSlug}-${safeFileName(file.name)}`;

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
    autoTitle,
  };
}

async function uploadAllPhotos(photos, photoTitles, collectDate) {
  const jobs = [];
  for (const role of PHOTO_ROLES) {
    if (photos[role]) {
      jobs.push(uploadPhoto(photos[role], role, collectDate, photoTitles[role]));
    }
  }
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
    uploadedPhotos = await uploadAllPhotos(
      data.photos,
      data.photoTitles,
      data.collectDate
    );
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
    email: data.email || null,
    collectDate: data.collectDate,
    collectDateYYMMDD: toYYMMDD(data.collectDate),
    streetCode: data.streetCode || null,
    buildingName: data.buildingName || null,
    photoContents: data.photoContents,
    photoTitles: data.photoTitles,
    photoFiles: uploadedPhotos,
    story: data.story,
    mediaType: "图片",
  };

  const { error } = await supabase.from("app_lib_h5_survey").insert({
    wechat_id: null,
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
  saveBasicInfo();
  form.reset();
  collectDateInput.value = todayISODate();
  storyCount.textContent = "0";
  resetPhotoTiles();
  loadBasicInfo();
  updateAllPhotoTitles();
}

form.addEventListener("submit", handleSubmit);
