(function ($) {
  function updateDesignButtons() {
    const button = document.querySelector(".mockup100-design-button")
    const form = document.querySelector("form.variations_form")
    if (!button || !form) {
      return
    }

    const baseUrl = button.getAttribute("data-base-url") || button.getAttribute("href") || ""
    if (!baseUrl) {
      return
    }

    function updateHref(variation) {
      const url = new URL(baseUrl, window.location.origin)
      const variationId = Number((variation && variation.variation_id) || 0)
      if (variationId > 0) {
        url.searchParams.set("variation_id", String(variationId))
      } else {
        url.searchParams.delete("variation_id")
      }

      const attributes = variation && variation.attributes ? variation.attributes : {}
      Object.entries(attributes).forEach(([key, value]) => {
        if (value) {
          url.searchParams.set(key, value)
        }
      })

      button.setAttribute("href", url.toString())
      button.classList.toggle("disabled", variationId === 0)
    }

    $(form).on("found_variation", function (_event, variation) {
      updateHref(variation)
    })
    $(form).on("reset_data hide_variation", function () {
      updateHref(null)
    })
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", updateDesignButtons, { once: true })
  } else {
    updateDesignButtons()
  }
})(jQuery)
