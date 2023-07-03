export const preview_input_code = `Usage: uname [OPTION]...
Print certain system information.  With no OPTION, same as -s.

  -a, --all                print all information, in the following order,
                             except omit -p and -i if unknown:
  -s, --kernel-name        print the kernel name
  -n, --nodename           print the network node hostname
  -r, --kernel-release     print the kernel release
  -v, --kernel-version     print the kernel version
  -m, --machine            print the machine hardware name
  -p, --processor          print the processor type (non-portable)
  -i, --hardware-platform  print the hardware platform (non-portable)
  -o, --operating-system   print the operating system
      --help     display this help and exit
      --version  output version information and exit

GNU coreutils online help: <https://www.gnu.org/software/coreutils/>
Report uname translation bugs to <https://translationproject.org/team/>
Full documentation at: <https://www.gnu.org/software/coreutils/uname>
or available locally via: info '(coreutils) uname invocation'`

export const preview_output_code = `
{
    "name": "uname",
    "description": "Print certain system information",
    "parameters": {
        "type": "object",
        "properties": {
            "all": {
                "type": "boolean",
                "description": "Print all information"
            },
            "kernel-name": {
                "type": "boolean",
                "description": "Print the kernel name"
            },
            "nodename": {
                "type": "boolean",
                "description": "Print the network node hostname"
            },
            "kernel-release": {
                "type": "boolean",
                "description": "Print the kernel release"
            },
            "kernel-version": {
                "type": "boolean",
                "description": "Print the kernel version"
            },
            "machine": {
                "type": "boolean",
                "description": "Print the machine hardware name"
            },
            "processor": {
                "type": "boolean",
                "description": "Print the processor type (non-portable)"
            },
            "hardware-platform": {
                "type": "boolean",
                "description": "Print the hardware platform (non-portable)"
            },
            "operating-system": {
                "type": "boolean",
                "description": "Print the operating system"
            }
        },
        "required": []
    }
}`


export const pre_prompt = `#!/bin/bash
user_input="$@"
response=$(curl -s https://api.openai.com/v1/chat/completions -u :$OPENAI_API_KEY -H 'Content-Type: application/json' -d '{
  "model": "gpt-3.5-turbo-0613",
  "messages": [
    {"role": "user", "content": "'"$user_input"'"}
  ],
  "functions": [`
export const post_prompt = `]}')

# Parsing JSON data
full_command=$(echo "$response" | jq -r '.choices[0].message.function_call.name')
args=$(echo "$response" | jq '.choices[0].message.function_call.arguments')

args=$(echo -e $args | tr -d '\\\\')
args=$(echo $args | sed 's/^"//;s/"$//')

for key in $(echo "$args" | jq -r 'keys[]'); do
    value=$(echo $args | jq -r --arg key $key '.[$key]')
    if [ "$value" != "true" ] && [ "$value" != "false" ]; then
        full_command+=" --$key "$value" "
    else
        full_command+=" --$key "
    fi
done

echo "Run: $full_command"
eval "$full_command"
`