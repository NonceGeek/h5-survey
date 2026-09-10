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
const collectDateInput = document.getElementById("collectDate");
const streetCodeInput = document.getElementById("streetCode");
const buildingNameInput = document.getElementById("buildingName");
const regionOtherRadio = document.getElementById("regionOtherRadio");
const regionOtherInput = document.getElementById("regionOtherInput");
const regionOutsideRadio = document.getElementById("regionOutsideRadio");
const regionOutsideInput = document.getElementById("regionOutsideInput");
const regionOverseasRadio = document.getElementById("regionOverseasRadio");
const regionOverseasInput = document.getElementById("regionOverseasInput");

const PHOTO_STORY_NAMES = {
  facade: "storyFacade",
  detail1: "storyDetail1",
  detail2: "storyDetail2",
};

const REGION_EXTRA_FIELDS = [
  { value: "省外", radio: regionOutsideRadio, input: regionOutsideInput },
  { value: "海外", radio: regionOverseasRadio, input: regionOverseasInput },
  { value: "其他", radio: regionOtherRadio, input: regionOtherInput },
];

function syncRegionExtraInputs() {
  REGION_EXTRA_FIELDS.forEach(({ radio, input }) => {
    if (!radio.checked) input.value = "";
  });
}

function formatRegionValue(base, detail) {
  const text = (detail || "").trim();
  return text ? `${base}（${text}）` : base;
}

function parseRegionValue(region) {
  const match = String(region || "").match(/^(省外|海外|其他)(?:（(.+)）)?$/);
  if (!match) return { base: region, detail: "" };
  return { base: match[1], detail: match[2] || "" };
}

form.querySelectorAll('input[name="region"]').forEach((el) => {
  el.addEventListener("change", syncRegionExtraInputs);
});

REGION_EXTRA_FIELDS.forEach(({ radio, input }) => {
  input.addEventListener("pointerdown", (e) => {
    e.stopPropagation();
  });
  input.addEventListener("focus", () => {
    radio.checked = true;
    syncRegionExtraInputs();
  });
  input.addEventListener("input", () => {
    radio.checked = true;
  });
});

function getBasicInfoFromForm() {
  const formData = new FormData(form);
  let region = formData.get("region") || "";
  let regionDetail = "";
  if (region === "省外") {
    regionDetail = (formData.get("regionOutside") || "").trim();
    region = formatRegionValue("省外", regionDetail);
  } else if (region === "海外") {
    regionDetail = (formData.get("regionOverseas") || "").trim();
    region = formatRegionValue("海外", regionDetail);
  } else if (region === "其他") {
    regionDetail = (formData.get("regionOther") || "").trim();
    region = formatRegionValue("其他", regionDetail);
  }
  return {
    gender: formData.get("gender") || "",
    ageRange: formData.get("ageRange") || "",
    region,
    regionDetail,
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
    const { base, detail } = parseRegionValue(info.region);
    const extra = REGION_EXTRA_FIELDS.find((item) => item.value === base);
    if (extra) {
      extra.radio.checked = true;
      syncRegionExtraInputs();
      extra.input.value = detail || info.regionDetail || "";
    } else {
      const el = form.querySelector(
        `input[name="region"][value="${CSS.escape(info.region)}"]`
      );
      if (el) el.checked = true;
      syncRegionExtraInputs();
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
    'input[name="gender"], input[name="ageRange"], input[name="region"], input[name="regionOther"], input[name="regionOutside"], input[name="regionOverseas"], input[name="phone"], input[name="email"]'
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

document.querySelectorAll(".photo-story-input").forEach((input) => {
  const countId = input.dataset.storyCount;
  const countEl = countId ? document.getElementById(countId) : null;
  const syncCount = () => {
    if (countEl) countEl.textContent = String(input.value.length);
  };
  syncCount();
  input.addEventListener("input", syncCount);
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
  if (region === "省外") {
    region = formatRegionValue("省外", formData.get("regionOutside"));
  } else if (region === "海外") {
    region = formatRegionValue("海外", formData.get("regionOverseas"));
  } else if (region === "其他") {
    region = formatRegionValue("其他", formData.get("regionOther"));
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
    stories: {
      facade: (formData.get(PHOTO_STORY_NAMES.facade) || "").trim(),
      detail1: (formData.get(PHOTO_STORY_NAMES.detail1) || "").trim(),
      detail2: (formData.get(PHOTO_STORY_NAMES.detail2) || "").trim(),
    },
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
  if (data.photos.facade && !data.stories.facade)
    errors.storyFacade = "请填写照片 1 的故事线索";
  if (data.photos.detail1 && !data.stories.detail1)
    errors.storyDetail1 = "请填写照片 2 的故事线索";
  if (data.photos.detail2 && !data.stories.detail2)
    errors.storyDetail2 = "请填写照片 3 的故事线索";
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

function fileExtension(name, fallback = ".jpg") {
  const match = String(name).match(/(\.[a-zA-Z0-9]+)$/);
  return match ? match[1].toLowerCase() : fallback;
}

async function uploadPhoto(file, role, collectDate, autoTitle, story) {
  const yymmdd = toYYMMDD(collectDate) || "unknown";
  const stamp = Date.now();
  const ext = fileExtension(file.name);
  // Supabase Storage keys must be ASCII-safe; keep Chinese titles in metadata only
  const path = `${EVENT_ID}/${yymmdd}/${stamp}-${role}${ext}`;

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
    story: story || null,
  };
}

async function uploadAllPhotos(photos, photoTitles, stories, collectDate) {
  const jobs = [];
  for (const role of PHOTO_ROLES) {
    if (photos[role]) {
      jobs.push(
        uploadPhoto(
          photos[role],
          role,
          collectDate,
          photoTitles[role],
          stories[role]
        )
      );
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
      data.stories,
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
    stories: data.stories,
    photoFiles: uploadedPhotos,
    mediaType: "图片",
  };

  const { error } = await supabase.from("app_lib_h5_survey").insert({
    phone: data.phone,
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
  document.querySelectorAll(".photo-story-input").forEach((input) => {
    const countId = input.dataset.storyCount;
    const countEl = countId ? document.getElementById(countId) : null;
    if (countEl) countEl.textContent = "0";
  });
  resetPhotoTiles();
  loadBasicInfo();
  updateAllPhotoTitles();
}

form.addEventListener("submit", handleSubmit);
