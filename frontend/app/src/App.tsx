import { useState } from "react"
import { useMutation } from "@tanstack/react-query"

function App() {
  const [count, setCount] = useState(0)

  return (
    <>
      <h4>RentDaddy</h4>

      <Items />
    </>
  )
}

function Items() {
  // Mutations //isPending not used currently, left for learning.
  const { mutate: createPost, isPending: isDeleting } = useMutation({
    mutationFn: async () => {
      const res = await fetch("http://localhost:3069/test/post", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: "1" }),
      })
      return res
    },
    onSuccess: () => {
      // Invalidate and refetch
      console.log("succes")
    },
    onError: (e: any) => {
      console.log("error ", e)
    },
  })

  const { mutate: createPut } = useMutation({
    mutationFn: async () => {
      const res = await fetch("http://localhost:3069/test/put", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: "1" }),
      })
      return res
    },
    onSuccess: () => {
      // Invalidate and refetch
      console.log("success")
    },
    onError: (e: any) => {
      console.log("error ", e)
    },
  })

  const { mutate: createDelete } = useMutation({
    mutationFn: async () => {
      const res = await fetch("http://localhost:3069/test/delete", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: "1" }),
      })
      return res
    },
    onSuccess: () => {
      // Invalidate and refetch
      console.log("success")
    },
    onError: (e: any) => {
      console.log("error ", e)
    },
  })

  const { mutate: createGet } = useMutation({
    mutationFn: async () => {
      const res = await fetch("http://localhost:3069/test/get", {
        method: "GET",
        headers: { "Content-Type": "application/json" },
      })
      return res
    },
    onSuccess: () => {
      // Invalidate and refetch
      console.log("success")
    },
    onError: (e: any) => {
      console.log("error ", e)
    },
  })

  const { mutate: createPatch } = useMutation({
    mutationFn: async () => {
      const res = await fetch("http://localhost:3069/test/patch", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: "1" }),
      })
      return res
    },
    onSuccess: () => {
      // Invalidate and refetch
      console.log("success")
    },
    onError: (e: any) => {
      console.log("error ", e)
    },
  })

  return (
    <div className="flex g-2">
      <button
        className="btn btn-primary m-2"
        onClick={() => {
          createGet()
        }}
      >
        GET
      </button>
      <button
        className="btn btn-secondary  m-2"
        onClick={() => {
          createPost()
        }}
      >
        Post
      </button>
      <button
        className="btn btn-warning  m-2"
        onClick={() => {
          createPut()
        }}
      >
        Put
      </button>
      <button
        className="btn btn-light  m-2"
        onClick={() => {
          createDelete()
        }}
      >
        Delete
      </button>
      <button
        className="btn btn-dark  m-2"
        onClick={() => {
          createPatch()
        }}
      >
        Patch
      </button>
    </div>
  )
}

export default App
