FILE="../poc-xml/vallee de garonne sud-20150101-20151231_dup_more.xml"
URL="${1:-http://localhost:3000/depot/upload}"

for i in {1..20}; do
{
    echo "=== Job $i starting ==="

    # Run curl and capture output + status code
    RESPONSE=$(curl -s -w "\n%{http_code}" --location "$URL" \
      --form "file=@\"$FILE\"")

    BODY=$(echo "$RESPONSE" | sed '$d')       # all but last line
    STATUS=$(echo "$RESPONSE" | tail -n1)     # last line = status code

    echo "Job $i → HTTP $STATUS"
    echo "Job $i response:"
    echo "$BODY"
    echo "=== Job $i done ==="
    echo
} &
    sleep 10
done

wait
echo "All uploads completed."