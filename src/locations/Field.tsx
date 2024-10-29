import { FieldAppSDK } from "@contentful/app-sdk";
import {
  Button,
  HelpText,
  IconButton,
  Note,
  Stack,
  TextInput,
  TextLink,
} from "@contentful/f36-components";
import tokens from "@contentful/f36-tokens";
import { CycleIcon, ExternalLinkIcon, CopyIcon } from "@contentful/f36-icons";
import { useSDK } from "@contentful/react-apps-toolkit";
import { css } from "@emotion/css";
import React, { useEffect, useRef, useState } from "react";
import slugify from "@sindresorhus/slugify";

const Field = () => {
  const sdk = useSDK<FieldAppSDK>();
  const cma = sdk.cma;
  const debounceInterval: any = useRef(false);
  const detachExternalChangeHandler: any = useRef(null);
  const isLoaded: any = useRef(false);
  const [value, setValue] = useState<string | undefined>(
    sdk.field.getValue() || ""
  );
  const locale = sdk.field.locale;
  const availableLocales = sdk.locales.available;
  const defaultLocale = sdk.locales.default;
  const isLocalized = sdk.contentType.fields.find(
    (field) => field.id === sdk.field.id
  )?.localized;

  const [prevPubSlug, setPrevPubSlug] = useState<string>('');

  const {
    paths = [],
    models = [],
    pathPrefix = "",
    showPathPrefix = true,
    lockWhenPublished = false,
    maintainCase = false,
    preserveLeadingUnderscore = false,
    showCopyButton = false,
    showPreviewLink = true,
    customReplacements = [],
    preserveCharacters = [],
  } = sdk.parameters.installation;

  let overridePathPrefix = pathPrefix;

  const {
    showWebsiteUrl = true,
    showPreviewUrl = true,
    instancePathPrefix = "",
    helpText = ""
  } = sdk.parameters.instance;

  if (instancePathPrefix) {
    overridePathPrefix = instancePathPrefix;
  }

  const slugOptions: any = {
    preserveLeadingUnderscore,
    customReplacements,
    preserveCharacters: [...preserveCharacters, "/"],
    lowercase: !maintainCase,
  };

  const localePath = paths[locale] || paths[defaultLocale];
  const pattern =
    models[sdk.ids.contentType]?.patterns?.[locale] ||
    models[sdk.ids.contentType]?.patterns?.[defaultLocale];

  const parts = pattern
    ?.split(/((?<!field):+1|\/|-)/)
    ?.map((part: string) => part.replace(/(\[|\])/gi, "").trim());

  const fields: string[] = [];

  // Extract fields used in slug parts.
  parts?.forEach((part: string) => {
    if (part.startsWith("field:")) {
      fields.push(part.replace("field:", ""));
    }
  });

  // get currently published slug via snapshots, not CDA (too slow)
  // listen for publish to get new currently published slug
  useEffect(() => {
    sdk.entry.onSysChanged(async (sys) => {
      const snapshots = await sdk.cma.snapshot.getManyForEntry({ entryId: sdk.entry.getSys().id});
      const published = snapshots.items[0]?.snapshot;
      if (published) {
        const publishedSlug = published.fields[sdk.field.id];
        setPrevPubSlug(publishedSlug?.[sdk.field.locale] ? String(publishedSlug[sdk.field.locale]) : '');
      }
    })
  }, []);

  useEffect(() => {
    sdk.window.startAutoResizer();
    const listeners: (() => void)[] = [];

    // Create a listener for each field and matching locales.
    for (const field of fields) {
      const fieldParts = field.split(":");
      const fieldName = fieldParts.length === 1 ? field : fieldParts[0];
      if (fieldName in sdk.entry.fields) {
        const locales = sdk.entry.fields[fieldName].locales;

        for (const locale of locales) {
          const listener = sdk.entry.fields[fieldName].onValueChanged(
            locale,
            () => {
              if (debounceInterval.current) {
                clearInterval(debounceInterval.current);
              }
              debounceInterval.current = setTimeout(() => {
                if (isLocalized) {
                  // Reference field may not be localized but the slug field is.
                  for (const loc of availableLocales) {
                    updateSlug(loc);
                  }
                } else {
                  updateSlug(locale);
                }
              }, 500);
            }
          );
          listeners.push(listener);
        }
      }
    }

    window.setTimeout(() => {
      isLoaded.current = true;
    }, 1000);

    // Handler for external field value changes (e.g. when multiple authors are working on the same entry).
    if (sdk.field) {
      detachExternalChangeHandler.current =
        sdk.field.onValueChanged(onExternalChange);
    }

    return () => {
      // Remove debounce interval
      if (debounceInterval.current) {
        clearInterval(debounceInterval.current);
      }

      // Remove external change listener
      if (detachExternalChangeHandler.current) {
        detachExternalChangeHandler.current();
      }

      // Remove all other listeners
      for (const listener of listeners) {
        listener?.();
      }
    };
  }, []);

  const onExternalChange = (value: string) => {
    if (isLoaded.current) {
      setValue(value);
    }
  };

  const getReferenceFieldValue = async (
    fieldName: string,
    subFieldName: string,
    locale: string
  ) => {
    const defaultLocale = sdk.locales.default;
    if (!sdk.entry.fields[fieldName]) {
      return "";
    }

    const referenceLocale = sdk.entry.fields[fieldName]?.locales.includes(locale)
      ? locale
      : defaultLocale;

    const reference = sdk.entry.fields[fieldName].getValue(referenceLocale);
    if (!reference || !reference.sys || !reference.sys.id) {
      return "";
    }

    const result = await cma.entry.get({ entryId: reference.sys.id });
    const { fields } = result;

    if (!fields) {
      return "";
    }

    if (!Object.prototype.hasOwnProperty.call(fields, subFieldName)) {
      return "";
    }

    if (Object.prototype.hasOwnProperty.call(fields[subFieldName], locale)) {
      return fields[subFieldName][locale];
    }

    if (
      Object.prototype.hasOwnProperty.call(fields[subFieldName], defaultLocale)
    ) {
      return fields[subFieldName][defaultLocale];
    }

    return "";
  };

  const isPublished = () => {
    const sys: any = sdk.entry.getSys();
    return !!sys.publishedVersion && sys.version === sys.publishedVersion + 1;
  };

  // slug can be changed if previous published slug was empty
  // or if the entry is not currently published.
  const canBeChanged = () => {
    return !isPublished() || prevPubSlug === '';
  };

  const isLocked = () => {
    const sys: any = sdk.entry.getSys();
    const changed = !!sys.publishedVersion && sys.version >= sys.publishedVersion + 2;

    return isPublished() || changed;
  };

  const updateSlug = async (locale: string, force = false) => {
    if (
      !isLoaded.current ||
      sdk.field.locale !== locale ||
      (!force && lockWhenPublished && isLocked())
    ) {
      return;
    }

    const defaultLocale = sdk.locales.default;
    const slugParts: string[] = [];

    for (const part of parts) {
      if (part.startsWith("field:")) {
        const fieldParts = part.split(":");
        let raw = "";
        let slug = "";

        if (fieldParts.length === 2) {
          if (sdk.entry.fields[fieldParts[1]] !== undefined) {
            if (sdk.entry.fields[fieldParts[1]].locales.includes(locale)) {
              raw = sdk.entry.fields[fieldParts[1]].getValue(locale);
            } else {
              raw = sdk.entry.fields[fieldParts[1]].getValue(defaultLocale);
            }
          }
          slug = raw ? slugify(raw, slugOptions) : '';
        } else {
          raw =
            (await getReferenceFieldValue(
              fieldParts[1],
              fieldParts[2],
              locale
            )) || "";
          slug = raw ? slugify(raw, slugOptions) : '';
        }

        slugParts.push(slug);
      } else if (part === "locale") {
        if (localePath) {
          slugParts.push(localePath);
        }
      } else if (part === "year") {
        slugParts.push(new Date().getFullYear().toString());
      } else if (part === "month") {
        slugParts.push(
          new Date().toLocaleString(undefined, { month: "2-digit" })
        );
      } else if (part === "day") {
        slugParts.push(
          new Date().toLocaleString(undefined, { day: "2-digit" })
        );
      } else if (part === "id") {
        slugParts.push(sdk.entry.getSys().id);
      } else if (part !== "/") {
        slugParts.push(part);
      }
    }

    sdk.entry.fields[sdk.field.id].setValue(
      slugParts
        .join("/")
        .replace(/\/\//g, "/")
        .replace(/\/$/, "")
        .replace(/\/-\//g, "-")
        .replace(/\/:\//g, ":")
        .replace(/^\//, ''), // remove leading /
      locale
    );
  };

  const onInputChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.currentTarget.value
      .split("-")
      .map((part) => slugify(part, slugOptions))
      .join("-");

    setValue(value);

    if (value) {
      await sdk.field.setValue(value);
    } else {
      await sdk.field.removeValue();
    }
  };

  if (!pattern) {
    return (
      <Note
        title="App not configured!"
        style={{ maxWidth: "800px" }}
        variant="warning"
      >
        No slug pattern found for this content type. Please add a new slug
        pattern in the app configuration.
      </Note>
    );
  }

  return (
    <Stack flexDirection="column" alignItems="flex-start">
      <TextInput.Group>
        {(showPathPrefix || showWebsiteUrl) && overridePathPrefix?.length > 0 && (
          <Button
            isActive
            isDisabled
            id="slug-prefix"
            className={css({
              fontSize: tokens.fontSizeS,
              color: 'black !important',
              maxWidth: "175px",
            })}
          >
            {overridePathPrefix}
          </Button>
        )}
        <TextInput
          aria-label="Slug"
          id={sdk.field.id}
          value={value || ""}
          onChange={onInputChange}
          isDisabled={!canBeChanged()}
          isRequired
        />
        <IconButton
          variant="secondary"
          isDisabled={!canBeChanged()}
          icon={<CycleIcon />}
          onClick={() => updateSlug(locale, true)}
          aria-label="Reset slug value"
        />
        {showCopyButton && (
          <IconButton
            variant="secondary"
            icon={<CopyIcon />}
            onClick={() =>
              navigator.clipboard.writeText(`${overridePathPrefix}/${value}`)
            }
            aria-label="Copy slug value to clipboard"
          />
        )}
      </TextInput.Group>

      {(showPreviewLink || showPreviewUrl) &&
        overridePathPrefix?.length > 0 &&
        value && (
          <TextLink
            href={`${overridePathPrefix}/${value}`}
            target="_blank"
            className={css({ fontSize: tokens.fontSizeS, marginTop: -10 })}
            icon={<ExternalLinkIcon size="tiny" />}
            alignIcon="end"
          >
            {`${overridePathPrefix}/${value}`}
          </TextLink>
        )}

        {helpText && <HelpText>{helpText}</HelpText>}
    </Stack>
  );
};

export default Field;
