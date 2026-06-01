const orderForm = document.getElementById("basin-order-form");

if (orderForm) {
  const statusMessage = document.getElementById("form-status");
  const selectedPackageLabel = document.getElementById("selected-package-label");
  const packageRadios = Array.from(orderForm.querySelectorAll(".package-radio"));
  const packageCards = Array.from(orderForm.querySelectorAll(".package-card"));
  const fileInputs = Array.from(orderForm.querySelectorAll('input[type="file"]'));

  function setStatus(message, statusClass) {
    if (!statusMessage) {
      return;
    }

    statusMessage.className = statusClass ? `form-status ${statusClass}` : "form-status";
    statusMessage.textContent = message;
  }

  function selectedPackage() {
    const checked = orderForm.querySelector('input[name="package"]:checked');
    return checked ? checked.dataset.label || checked.value : "";
  }

  function updateSelectedPackage() {
    const packageText = selectedPackage();

    packageCards.forEach((card) => {
      const cardInput = card.querySelector(".package-radio");
      card.classList.toggle("is-selected", Boolean(cardInput && cardInput.checked));
    });

    if (selectedPackageLabel) {
      selectedPackageLabel.textContent = packageText || "Choose one above";
    }
  }

  function clearPreview(input) {
    const slot = input.closest(".photo-slot");
    if (!slot) {
      return;
    }

    const preview = slot.querySelector(".photo-preview");
    const removeButton = slot.querySelector(".photo-remove");

    if (preview) {
      if (preview.dataset.previewUrl) {
        URL.revokeObjectURL(preview.dataset.previewUrl);
      }

      preview.removeAttribute("src");
      preview.dataset.previewUrl = "";
      preview.hidden = true;
    }

    if (removeButton) {
      removeButton.hidden = true;
    }
  }

  function updatePhotoPreview(input) {
    clearPreview(input);

    const file = input.files && input.files[0];
    if (!file || !file.type.startsWith("image/")) {
      return;
    }

    const slot = input.closest(".photo-slot");
    const preview = slot ? slot.querySelector(".photo-preview") : null;
    const removeButton = slot ? slot.querySelector(".photo-remove") : null;
    const previewUrl = URL.createObjectURL(file);

    if (preview) {
      preview.src = previewUrl;
      preview.dataset.previewUrl = previewUrl;
      preview.hidden = false;
    }

    if (removeButton) {
      removeButton.hidden = false;
    }

    setStatus("Photo added. It will upload with your request.", "is-uploading");
  }

  packageRadios.forEach((radio) => {
    radio.addEventListener("change", updateSelectedPackage);
  });

  fileInputs.forEach((input) => {
    const slot = input.closest(".photo-slot");
    const removeButton = slot ? slot.querySelector(".photo-remove") : null;

    input.addEventListener("change", () => {
      updatePhotoPreview(input);
    });

    if (removeButton) {
      removeButton.addEventListener("click", () => {
        input.value = "";
        clearPreview(input);
        setStatus("Photo removed.", "");
      });
    }
  });

  orderForm.addEventListener("submit", () => {
    const submitButton = orderForm.querySelector('button[type="submit"]');

    if (submitButton) {
      submitButton.disabled = true;
      submitButton.textContent = "Uploading...";
    }

    setStatus("Uploading your photos. Please do not close this page.", "is-uploading");
  });

  updateSelectedPackage();
}
