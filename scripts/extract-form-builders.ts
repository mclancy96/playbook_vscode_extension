import * as fs from "fs"
import * as path from "path"

interface FormBuilderField {
  name: string
  kit: string
  props: Record<string, any>
}

interface FormBuilderMetadata {
  fields: FormBuilderField[]
}

const PLAYBOOK_REPO_PATH = process.env.PLAYBOOK_REPO_PATH || "../playbook/playbook"

/**
 * Extract form builder metadata from the Playbook repository
 */
function extractFormBuilderMetadata(): FormBuilderMetadata {
  const builderFilePath = path.join(
    PLAYBOOK_REPO_PATH,
    "lib/playbook/forms/builder.rb"
  )

  if (!fs.existsSync(builderFilePath)) {
    console.error(`Builder file not found: ${builderFilePath}`)
    return { fields: [] }
  }

  const builderContent = fs.readFileSync(builderFilePath, "utf-8")
  const fields: FormBuilderField[] = []

  const formFieldBuilderRegex =
    /prepend\(FormFieldBuilder\.new\(:(\w+),\s*kit_name:\s*"([^"]+)"\)\)/g
  let match

  while ((match = formFieldBuilderRegex.exec(builderContent)) !== null) {
    const fieldName = match[1]
    const kitName = match[2]

    const kitProps = getKitProps(kitName)

    fields.push({
      name: fieldName,
      kit: kitName,
      props: kitProps
    })

    console.log(`Found form field: ${fieldName} -> ${kitName}`)
  }

  const builderDir = path.join(PLAYBOOK_REPO_PATH, "lib/playbook/forms/builder")
  if (fs.existsSync(builderDir)) {
    const files = fs.readdirSync(builderDir)

    for (const file of files) {
      if (file.endsWith(".rb") && file !== "form_field_builder.rb") {
        const fieldName = file.replace(".rb", "")
        const filePath = path.join(builderDir, file)
        const content = fs.readFileSync(filePath, "utf-8")

        const pbRailsMatch = content.match(/pb_rails\(\s*"([^"]+)",/)
        if (pbRailsMatch) {
          const kitName = pbRailsMatch[1]
          const kitProps = getKitProps(kitName)

          if (!fields.find((f) => f.name === fieldName)) {
            fields.push({
              name: fieldName,
              kit: kitName,
              props: kitProps
            })

            console.log(`Found custom form field: ${fieldName} -> ${kitName}`)
          }
        }
      }
    }
  }

  const commonProps = {
    label: { type: "string | boolean" },
    placeholder: { type: "string" },
    required: { type: "boolean" },
    required_indicator: { type: "boolean" },
    error: { type: "string" },
    disabled: { type: "boolean" },
    autocomplete: { type: "string | boolean" },
    mask: {
      type: "enum",
      values: ["currency", "zip_code", "postal_code", "ssn", "credit_card", "cvv"]
    },
    validation: { type: "hash" },
    emoji_mask: { type: "boolean" },
    value: { type: "any" },
    type: { type: "string" },
    input_options: { type: "hash" },
    input_data: { type: "hash" },
    input_aria: { type: "hash" }
  }

  fields.forEach((field) => {
    field.props = { ...commonProps, ...field.props }
  })

  return { fields }
}

/**
 * Get props for a specific kit by reading from playbook.json
 */
function getKitProps(kitName: string): Record<string, any> {
  const metadataPath = path.join(__dirname, "../data/playbook.json")

  if (!fs.existsSync(metadataPath)) {
    console.warn(`Metadata file not found: ${metadataPath}`)
    return {}
  }

  const metadata = JSON.parse(fs.readFileSync(metadataPath, "utf-8"))
  const component = Object.values(metadata.components || {}).find(
    (c: any) => c.rails === kitName || c.react === kitName
  ) as any

  if (!component || !component.props) {
    return {}
  }

  return component.props
}

/**
 * Main function
 */
function main() {
  console.log("Extracting form builder metadata...")
  const metadata = extractFormBuilderMetadata()

  const outputPath = path.join(__dirname, "../data/form-builders.json")
  fs.writeFileSync(outputPath, JSON.stringify(metadata, null, 2), "utf-8")

  console.log(`\nExtracted ${metadata.fields.length} form builder fields`)
  console.log(`Saved to: ${outputPath}`)
}

main()
