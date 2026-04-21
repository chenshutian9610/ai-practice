## ADDED Requirements

### Requirement: Tool calling integration in chat flow

The system SHALL integrate MCP tools into the LLM chat flow.

#### Scenario: Inject available tools into LLM request
- **WHEN** user sends a message with MCP Servers enabled
- **THEN** system SHALL include available MCP tools in the LLM request
- **AND** LLM SHALL be informed of tool schemas via tool_calls definition

#### Scenario: Execute tool call from LLM response
- **WHEN** LLM returns a tool_calls request
- **THEN** system SHALL extract the tool name and parameters
- **AND** system SHALL call the corresponding MCP tool
- **AND** system SHALL append the result to the message context

#### Scenario: Continue conversation after tool result
- **WHEN** tool call completes successfully
- **THEN** system SHALL send the result back to LLM
- **AND** system SHALL continue the conversation with the tool result

#### Scenario: Handle tool call loop
- **WHEN** LLM requests another tool call after receiving a result
- **THEN** system SHALL execute the new tool call
- **AND** system SHALL continue until LLM provides final response
- **OR** system SHALL stop after 10 tool calls to prevent infinite loops

#### Scenario: Tool call error handling
- **WHEN** a tool call fails
- **THEN** system SHALL send error information to LLM
- **AND** LLM SHALL decide whether to retry or continue

### Requirement: Tool call status in streaming response

The system SHALL display tool call progress to the user during streaming.

#### Scenario: Show tool call start event
- **WHEN** LLM requests a tool call during streaming
- **THEN** system SHALL emit a `tool_call` SSE event
- **AND** frontend SHALL display "Calling tool: {name}"

#### Scenario: Show tool result event
- **WHEN** tool call completes
- **THEN** system SHALL emit a `tool_result` SSE event
- **AND** frontend SHALL display the tool result briefly

#### Scenario: Show tool error event
- **WHEN** tool call fails
- **THEN** system SHALL emit a `tool_error` SSE event
- **AND** frontend SHALL display the error message

### Requirement: Security validation for MCP Server URLs

The system SHALL validate MCP Server URLs to prevent security issues.

#### Scenario: Reject internal network addresses
- **WHEN** user enters an MCP Server URL
- **THEN** system SHALL reject URLs pointing to private IP ranges
- **AND** system SHALL display a security warning

#### Scenario: Allow only HTTP/HTTPS protocols
- **WHEN** user enters an MCP Server URL
- **THEN** system SHALL reject non-HTTP protocols (file://, ftp://, etc.)
