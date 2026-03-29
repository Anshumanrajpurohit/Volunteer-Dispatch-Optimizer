export function formatDateTime(value) {
  if (!value) {
    return "N/A";
  }

  return new Intl.DateTimeFormat("en-US", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
}

export function formatSkills(skills) {
  if (!skills?.length) {
    return "No skills listed";
  }

  return skills.join(", ");
}

export function formatTimeValue(value) {
  if (!value) {
    return "N/A";
  }

  const text = String(value);
  return text.length >= 5 ? text.slice(0, 5) : text;
}

export function truncateText(value, maxLength = 72) {
  if (!value) {
    return "";
  }

  return value.length > maxLength ? `${value.slice(0, maxLength - 1)}...` : value;
}
