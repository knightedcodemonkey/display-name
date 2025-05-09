const memo = cb => {
  cb()
}
const Memo = memo(() => {
  return (
    <div>
      <h1>Memo</h1>
    </div>
  )
})
export { Memo }
