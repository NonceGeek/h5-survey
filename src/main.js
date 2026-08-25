import "./style.css";
import { supabase } from "./supabase.js";

const form = document.getElementById("surveyForm");
const submitBtn = document.getElementById("submitBtn");
const successOverlay = document.getElementById("successOverlay");
const otherCheckbox = document.getElementById("otherCheckbox");
const otherInput = document.getElementById("otherInput");

otherCheckbox.addEventListener("change", () => {
  otherInput.disabled = !otherCheckbox.checked;
  if (!otherCheckbox.checked) {
    otherInput.value = "";
  }
});

function getFormData() {
  const formData = new FormData(form);
  const wechatId = (formData.get("wechatId") || "").trim();
  const gender = formData.get("gender") || "";
  const ageRange = formData.get("ageRange") || "";
  const region = formData.get("region") || "";
  const phone = (formData.get("phone") || "").trim();

  const activityTypes = formData.getAll("activityType");
  if (otherCheckbox.checked && otherInput.value.trim()) {
    const idx = activityTypes.indexOf("其他");
    if (idx !== -1) {
      activityTypes[idx] = `其他（${otherInput.value.trim()}）`;
    }
  }

  return { wechatId, gender, ageRange, region, activityTypes, phone };
}

function validate(data) {
  const errors = {};
  if (!data.wechatId) errors.wechatId = "请输入微信 ID";
  if (!data.gender) errors.gender = "请选择您的性别";
  if (!data.ageRange) errors.ageRange = "请选择您的年龄段";
  if (!data.region) errors.region = "请选择您熟悉的语言文化地区";
  if (!data.activityTypes || data.activityTypes.length === 0)
    errors.activityType = "请至少选择一项活动类型";
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

async function handleSubmit(e) {
  e.preventDefault();

  const data = getFormData();
  const errors = validate(data);
  showErrors(errors);
  if (Object.keys(errors).length > 0) return;

  submitBtn.disabled = true;
  submitBtn.textContent = "提交中...";

  const content = {
    wechatId: data.wechatId,
    gender: data.gender,
    ageRange: data.ageRange,
    region: data.region,
    activityTypes: data.activityTypes,
    phone: data.phone || null,
  };

  const { error } = await supabase.from("app_lib_h5_survey").insert({
    content,
  });

  submitBtn.disabled = false;
  submitBtn.textContent = "提交";

  if (error) {
    alert("提交失败，请稍后重试：" + error.message);
    return;
  }

  successOverlay.classList.add("show");
  form.reset();
  otherInput.disabled = true;
  otherInput.value = "";
}

form.addEventListener("submit", handleSubmit);
