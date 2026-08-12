import { describe, expect, it } from "vitest";

import {
  serviceCreateSchema,
  serviceFormSchema,
  serviceItemCreateSchema,
  serviceItemFormSchema,
  serviceItemUpdateSchema,
  serviceUpdateSchema,
} from "./services";

const validService = {
  name: "Bridal Styling",
  slug: "bridal-styling",
  serviceTemplateId: "service-one",
  published: true,
};

const validServiceItem = {
  name: "Trial Run",
  published: true,
};

describe("serviceFormSchema", () => {
  it("accepts a fully-valid payload", () => {
    expect(serviceFormSchema.safeParse(validService).success).toBe(true);
  });

  describe("name", () => {
    it("rejects an empty name", () => {
      expect(
        serviceFormSchema.safeParse({ ...validService, name: "" }).success,
      ).toBe(false);
    });

    it("rejects a name over 120 characters", () => {
      expect(
        serviceFormSchema.safeParse({ ...validService, name: "a".repeat(121) })
          .success,
      ).toBe(false);
    });

    it("accepts a name of exactly 120 characters", () => {
      expect(
        serviceFormSchema.safeParse({ ...validService, name: "a".repeat(120) })
          .success,
      ).toBe(true);
    });
  });

  describe("slug", () => {
    // The slug is a real, owner-owned field now. It used to be regenerated
    // from `name` on every save, which silently moved a published service's
    // public URL — these cases pin the contract to Collections'.
    it("is required — a payload with no slug at all is rejected", () => {
      const withoutSlug = {
        name: validService.name,
        serviceTemplateId: validService.serviceTemplateId,
        published: validService.published,
      };
      expect(serviceFormSchema.safeParse(withoutSlug).success).toBe(false);
    });

    it("accepts a normal slug", () => {
      expect(
        serviceFormSchema.safeParse({
          ...validService,
          slug: "bridal-styling",
        }).success,
      ).toBe(true);
    });

    it("rejects an empty slug with the 'Slug is required' message", () => {
      const result = serviceFormSchema.safeParse({
        ...validService,
        slug: "",
      });
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues.map((issue) => issue.message)).toContain(
          "Slug is required",
        );
      }
    });

    it("rejects a slug containing spaces", () => {
      expect(
        serviceFormSchema.safeParse({
          ...validService,
          slug: "bridal styling",
        }).success,
      ).toBe(false);
    });

    it("rejects characters outside the allowed set", () => {
      expect(
        serviceFormSchema.safeParse({
          ...validService,
          slug: "bridal/styling",
        }).success,
      ).toBe(false);
    });

    it("accepts uppercase letters because the regex is case-insensitive", () => {
      expect(
        serviceFormSchema.safeParse({
          ...validService,
          slug: "Bridal-Styling",
        }).success,
      ).toBe(true);
    });

    it("accepts dots, dashes, tildes, and underscores", () => {
      expect(
        serviceFormSchema.safeParse({
          ...validService,
          slug: "bridal.styling_2026~v2",
        }).success,
      ).toBe(true);
    });

    it("rejects a slug over 255 characters", () => {
      expect(
        serviceFormSchema.safeParse({ ...validService, slug: "a".repeat(256) })
          .success,
      ).toBe(false);
    });

    it("accepts a slug of exactly 255 characters", () => {
      expect(
        serviceFormSchema.safeParse({ ...validService, slug: "a".repeat(255) })
          .success,
      ).toBe(true);
    });

    it("trims surrounding whitespace", () => {
      const result = serviceFormSchema.safeParse({
        ...validService,
        slug: "  bridal-styling  ",
      });
      expect(result.success).toBe(true);
      if (result.success) expect(result.data.slug).toBe("bridal-styling");
    });
  });

  describe("metaTitle", () => {
    it("accepts a metaTitle of exactly 70 characters", () => {
      expect(
        serviceFormSchema.safeParse({
          ...validService,
          metaTitle: "a".repeat(70),
        }).success,
      ).toBe(true);
    });

    it("rejects a metaTitle over 70 characters", () => {
      expect(
        serviceFormSchema.safeParse({
          ...validService,
          metaTitle: "a".repeat(71),
        }).success,
      ).toBe(false);
    });
  });

  describe("imageFile", () => {
    it("is part of the form schema so the picker can hold a deferred upload", () => {
      expect("imageFile" in serviceFormSchema.shape).toBe(true);
    });

    it("accepts a File", () => {
      const file = new File(["x"], "cover.png", { type: "image/png" });
      expect(
        serviceFormSchema.safeParse({ ...validService, imageFile: file })
          .success,
      ).toBe(true);
    });

    it("accepts null and undefined", () => {
      expect(
        serviceFormSchema.safeParse({ ...validService, imageFile: null })
          .success,
      ).toBe(true);
      expect(
        serviceFormSchema.safeParse({ ...validService, imageFile: undefined })
          .success,
      ).toBe(true);
    });

    it("rejects a non-File value", () => {
      expect(
        serviceFormSchema.safeParse({
          ...validService,
          imageFile: "not-a-file",
        }).success,
      ).toBe(false);
    });
  });
});

describe("serviceCreateSchema", () => {
  it("derives cleanly from serviceFormSchema and accepts a valid payload", () => {
    expect(serviceCreateSchema.safeParse(validService).success).toBe(true);
  });

  it("omits imageFile from its shape", () => {
    expect("imageFile" in serviceCreateSchema.shape).toBe(false);
  });

  it("still requires slug", () => {
    expect(
      serviceCreateSchema.safeParse({ ...validService, slug: "" }).success,
    ).toBe(false);
  });

  it("still enforces the slug character set", () => {
    expect(
      serviceCreateSchema.safeParse({ ...validService, slug: "bad slug" })
        .success,
    ).toBe(false);
  });

  it("drops an imageFile key rather than sending it over the wire", () => {
    const file = new File(["x"], "cover.png", { type: "image/png" });
    const result = serviceCreateSchema.safeParse({
      ...validService,
      imageFile: file,
    });
    expect(result.success).toBe(true);
    if (result.success) expect("imageFile" in result.data).toBe(false);
  });
});

describe("serviceUpdateSchema", () => {
  const validUpdate = { id: "svc_1", ...validService };

  it("derives cleanly from serviceFormSchema and accepts a valid payload", () => {
    expect(serviceUpdateSchema.safeParse(validUpdate).success).toBe(true);
  });

  it("omits imageFile from its shape", () => {
    expect("imageFile" in serviceUpdateSchema.shape).toBe(false);
  });

  it("still requires slug", () => {
    expect(
      serviceUpdateSchema.safeParse({ ...validUpdate, slug: "" }).success,
    ).toBe(false);
  });

  it("requires id", () => {
    expect(serviceUpdateSchema.safeParse(validService).success).toBe(false);
  });

  it("drops an imageFile key rather than sending it over the wire", () => {
    const file = new File(["x"], "cover.png", { type: "image/png" });
    const result = serviceUpdateSchema.safeParse({
      ...validUpdate,
      imageFile: file,
    });
    expect(result.success).toBe(true);
    if (result.success) expect("imageFile" in result.data).toBe(false);
  });
});

describe("serviceItemFormSchema", () => {
  it("accepts a fully-valid payload", () => {
    expect(serviceItemFormSchema.safeParse(validServiceItem).success).toBe(
      true,
    );
  });

  it("rejects an empty name", () => {
    expect(
      serviceItemFormSchema.safeParse({ ...validServiceItem, name: "" })
        .success,
    ).toBe(false);
  });

  describe("imageFile", () => {
    it("is part of the form schema so the picker can hold a deferred upload", () => {
      expect("imageFile" in serviceItemFormSchema.shape).toBe(true);
    });

    it("accepts a File", () => {
      const file = new File(["x"], "item.png", { type: "image/png" });
      expect(
        serviceItemFormSchema.safeParse({
          ...validServiceItem,
          imageFile: file,
        }).success,
      ).toBe(true);
    });

    it("accepts null and undefined", () => {
      expect(
        serviceItemFormSchema.safeParse({
          ...validServiceItem,
          imageFile: null,
        }).success,
      ).toBe(true);
      expect(
        serviceItemFormSchema.safeParse({
          ...validServiceItem,
          imageFile: undefined,
        }).success,
      ).toBe(true);
    });

    it("rejects a non-File value", () => {
      expect(
        serviceItemFormSchema.safeParse({
          ...validServiceItem,
          imageFile: "not-a-file",
        }).success,
      ).toBe(false);
    });
  });
});

describe("serviceItemCreateSchema", () => {
  const validItemCreate = { serviceId: "svc_1", ...validServiceItem };

  it("accepts a valid payload", () => {
    expect(serviceItemCreateSchema.safeParse(validItemCreate).success).toBe(
      true,
    );
  });

  it("omits imageFile from its shape", () => {
    expect("imageFile" in serviceItemCreateSchema.shape).toBe(false);
  });

  it("requires serviceId", () => {
    expect(serviceItemCreateSchema.safeParse(validServiceItem).success).toBe(
      false,
    );
  });

  it("drops an imageFile key rather than sending it over the wire", () => {
    const file = new File(["x"], "item.png", { type: "image/png" });
    const result = serviceItemCreateSchema.safeParse({
      ...validItemCreate,
      imageFile: file,
    });
    expect(result.success).toBe(true);
    if (result.success) expect("imageFile" in result.data).toBe(false);
  });
});

describe("serviceItemUpdateSchema", () => {
  const validItemUpdate = { id: "item_1", ...validServiceItem };

  it("accepts a valid payload", () => {
    expect(serviceItemUpdateSchema.safeParse(validItemUpdate).success).toBe(
      true,
    );
  });

  it("omits imageFile from its shape", () => {
    expect("imageFile" in serviceItemUpdateSchema.shape).toBe(false);
  });

  it("requires id", () => {
    expect(serviceItemUpdateSchema.safeParse(validServiceItem).success).toBe(
      false,
    );
  });

  it("drops an imageFile key rather than sending it over the wire", () => {
    const file = new File(["x"], "item.png", { type: "image/png" });
    const result = serviceItemUpdateSchema.safeParse({
      ...validItemUpdate,
      imageFile: file,
    });
    expect(result.success).toBe(true);
    if (result.success) expect("imageFile" in result.data).toBe(false);
  });
});
